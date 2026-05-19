package server_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer/mailertest"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/server"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/token"
)

const frontendURL = "http://localhost:5173"

// fixture builds a server with a fake mailer and a clock pinned to `now`.
type fixture struct {
	srv       *server.Server
	mailer    *mailertest.Fake
	publicKey ed25519.PublicKey
	now       time.Time
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	pub, privPEM := newEd25519PEM(t)
	now := time.Date(2026, 5, 12, 12, 0, 0, 0, time.UTC)

	signer, err := token.NewSigner(token.Options{
		PrivateKeyPEM: privPEM,
		Now:           func() time.Time { return now },
	})
	if err != nil {
		t.Fatalf("new signer: %v", err)
	}
	fake := &mailertest.Fake{}
	s := server.New(server.Deps{
		Signer:      signer,
		Mailer:      fake,
		FrontendURL: frontendURL,
		SMTPFrom:    "noreply@example.com",
	})
	return &fixture{srv: s, mailer: fake, publicKey: pub, now: now}
}

func (f *fixture) post(t *testing.T, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	buf, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	f.srv.ServeHTTP(rr, req)
	return rr
}

// drain waits for in-flight background sends. The handler returns 202
// before the mailer is invoked, so tests must drain before asserting on
// recorded messages.
func (f *fixture) drain(t *testing.T) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := f.srv.Wait(ctx); err != nil {
		t.Fatalf("drain: %v", err)
	}
}

func TestStatus_OK(t *testing.T) {
	f := newFixture(t)
	req := httptest.NewRequest(http.MethodGet, "/status", nil)
	rr := httptest.NewRecorder()
	f.srv.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status: got %d want 200", rr.Code)
	}
	body, _ := io.ReadAll(rr.Body)
	if got := string(body); got != "ok" {
		t.Fatalf("body: got %q want %q", got, "ok")
	}
}

func TestEmailVerification_HappyPath(t *testing.T) {
	f := newFixture(t)
	const email = "test@example.com"

	rr := f.post(t, "/v1.0/auth/email-verification", map[string]string{"email": email})
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status: got %d want 202", rr.Code)
	}

	f.drain(t)

	sent, ok := f.mailer.LastSent()
	if !ok {
		t.Fatal("no email sent")
	}
	if sent.To != email {
		t.Errorf("to: got %q want %q", sent.To, email)
	}
	if !strings.Contains(sent.HTML, "href=") {
		t.Errorf("html missing href: %q", sent.HTML)
	}
	if !strings.Contains(sent.HTML, "verify?token=") {
		t.Errorf("html missing verify link: %q", sent.HTML)
	}

	re := regexp.MustCompile(`verify\?token=([^"]+)`)
	m := re.FindStringSubmatch(sent.HTML)
	if len(m) != 2 {
		t.Fatalf("could not extract token from html: %q", sent.HTML)
	}
	rawJWT := m[1]
	if !regexp.MustCompile(`^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`).MatchString(rawJWT) {
		t.Fatalf("token does not look like a JWS: %q", rawJWT)
	}

	parsed, err := jwt.ParseSigned(rawJWT, []jose.SignatureAlgorithm{jose.EdDSA})
	if err != nil {
		t.Fatalf("parse jwt: %v", err)
	}
	var claims jwt.Claims
	var private struct {
		Email string `json:"email"`
	}
	if err := parsed.Claims(f.publicKey, &claims, &private); err != nil {
		t.Fatalf("verify claims: %v", err)
	}
	if private.Email != email {
		t.Errorf("email claim: got %q want %q", private.Email, email)
	}
	if claims.IssuedAt == nil || claims.IssuedAt.Time().Unix() != f.now.Unix() {
		t.Errorf("iat: got %v want %v", claims.IssuedAt, f.now.Unix())
	}
	wantExp := f.now.Add(15 * time.Minute)
	if claims.Expiry == nil || claims.Expiry.Time().Unix() != wantExp.Unix() {
		t.Errorf("exp: got %v want %v", claims.Expiry, wantExp.Unix())
	}
}

// The handler returns 202 even for invalid input so callers can't tell
// valid/invalid/throttled apart. The check is that no mail goes out.
func TestEmailVerification_InvalidEmail(t *testing.T) {
	f := newFixture(t)
	rr := f.post(t, "/v1.0/auth/email-verification", map[string]string{"email": "invalid-email"})
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status: got %d want 202", rr.Code)
	}
	f.drain(t)
	if _, ok := f.mailer.LastSent(); ok {
		t.Error("mail was sent for invalid email")
	}
}

func TestEmailVerification_MissingEmail(t *testing.T) {
	f := newFixture(t)
	rr := f.post(t, "/v1.0/auth/email-verification", map[string]string{})
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status: got %d want 202", rr.Code)
	}
	f.drain(t)
	if _, ok := f.mailer.LastSent(); ok {
		t.Error("mail was sent for missing email")
	}
}

// Two requests for the same address within the throttle window: the first
// sends, the second is silently dropped (still 202).
func TestEmailVerification_ThrottlesRepeatAddress(t *testing.T) {
	f := newFixture(t)
	const email = "test@example.com"

	for i := range 2 {
		rr := f.post(t, "/v1.0/auth/email-verification", map[string]string{"email": email})
		if rr.Code != http.StatusAccepted {
			t.Fatalf("req %d: got %d want 202", i, rr.Code)
		}
	}
	f.drain(t)

	if got := len(f.mailer.Sent); got != 1 {
		t.Errorf("sent count: got %d want 1", got)
	}
}

// The mailer is invoked in the background, so a send failure must not
// affect the response. The client still gets 202; the operator sees the
// error in the logs (asserted by the goroutine completing without panic).
func TestEmailVerification_MailerFailureStillReturns202(t *testing.T) {
	f := newFixture(t)
	f.mailer.Err = errors.New("smtp down")
	rr := f.post(t, "/v1.0/auth/email-verification", map[string]string{"email": "test@example.com"})
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status: got %d want 202", rr.Code)
	}
	f.drain(t)
	if _, ok := f.mailer.LastSent(); ok {
		t.Error("mailer recorded a send despite returning an error")
	}
}

// newEd25519PEM returns a fresh Ed25519 key pair, the private half encoded as
// PKCS#8 PEM (the format the signer expects).
func newEd25519PEM(t *testing.T) (ed25519.PublicKey, string) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("gen key: %v", err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		t.Fatalf("marshal pkcs8: %v", err)
	}
	pemBlock := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
	return pub, string(pemBlock)
}
