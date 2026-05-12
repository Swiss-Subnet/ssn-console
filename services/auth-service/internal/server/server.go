package server

import (
	"bytes"
	"context"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"sync"
	"time"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

const emailVerificationTTL = 15 * time.Minute

// backgroundSendTimeout bounds each detached SMTP send. The handler returns
// 202 before the send starts, so this is independent of the HTTP request.
const backgroundSendTimeout = 30 * time.Second

// Signer mints email-verification tokens. Kept as an interface so tests can
// stub it the same way the mailer is stubbed.
type Signer interface {
	SignEmailVerification(email string, ttl time.Duration) (string, error)
}

type Deps struct {
	Signer      Signer
	Mailer      mailer.Mailer
	FrontendURL string
	SMTPFrom    string
}

// Server wraps the HTTP handler and tracks background mail sends so they
// can be drained on shutdown.
type Server struct {
	handler http.Handler
	wg      sync.WaitGroup
}

func New(deps Deps) *Server {
	s := &Server{}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /status", handleStatus)
	mux.HandleFunc("POST /v1.0/auth/email-verification", s.handleEmailVerification(deps))
	mux.HandleFunc("OPTIONS /v1.0/auth/email-verification", handlePreflight(deps.FrontendURL))
	s.handler = otelhttp.NewHandler(withCORS(mux, deps.FrontendURL), "auth-service")
	return s
}

func withCORS(next http.Handler, allowedOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Vary", "Origin")
		}
		next.ServeHTTP(w, r)
	})
}

func handlePreflight(allowedOrigin string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != allowedOrigin {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "600")
		w.Header().Set("Vary", "Origin")
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

// Wait blocks until every in-flight background send finishes or ctx expires.
// Returns ctx.Err() on timeout, nil otherwise.
func (s *Server) Wait(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("ok"))
}

type createEmailVerificationRequest struct {
	Email string `json:"email"`
}

// validEmail accepts bare addresses (no display name, no angle brackets).
// The real check is whether the verification email arrives; this just
// rejects obvious junk before we mint a token.
func validEmail(s string) bool {
	addr, err := mail.ParseAddress(s)
	return err == nil && addr.Address == s && addr.Name == ""
}

var verificationEmailHTML = template.Must(template.New("verify").Parse(
	`<p>Click <a href="{{.Link}}">here</a> to sign in to SSN Console.</p>` +
		`<p>This link will expire in 15 minutes.</p>`,
))

// Email-verification requests are tiny JSON ({"email":"..."}). Cap the body
// at 1 KiB so a malicious client can't make us allocate unbounded memory.
const maxRequestBody = 1 << 10

func (s *Server) handleEmailVerification(deps Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)
		var req createEmailVerificationRequest
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil {
			http.Error(w, "invalid body", http.StatusUnprocessableEntity)
			return
		}
		if !validEmail(req.Email) {
			http.Error(w, "invalid email", http.StatusUnprocessableEntity)
			return
		}

		jwt, err := deps.Signer.SignEmailVerification(req.Email, emailVerificationTTL)
		if err != nil {
			log.Printf("sign token: %v", err)
			http.Error(w, "sign token", http.StatusInternalServerError)
			return
		}

		link := deps.FrontendURL + "/verify?token=" + url.QueryEscape(jwt)
		var htmlBuf bytes.Buffer
		if err := verificationEmailHTML.Execute(&htmlBuf, struct{ Link string }{link}); err != nil {
			log.Printf("render email: %v", err)
			http.Error(w, "render email", http.StatusInternalServerError)
			return
		}
		msg := mailer.Message{
			From:    deps.SMTPFrom,
			To:      req.Email,
			Subject: "Swiss Subnet Email Verification",
			HTML:    htmlBuf.String(),
			Text: "Sign in to SSN Console by visiting this link: " + link +
				"\nThis link will expire in 15 minutes.",
		}

		// Detach the send: the client gets 202 without waiting for SMTP.
		// We use a fresh context (not r.Context()) so the send isn't
		// cancelled when we write the response. Wait() drains in-flight
		// sends on shutdown.
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			ctx, cancel := context.WithTimeout(context.Background(), backgroundSendTimeout)
			defer cancel()
			if err := deps.Mailer.Send(ctx, msg); err != nil {
				log.Printf("send mail to %s: %v", msg.To, err)
			}
		}()

		w.WriteHeader(http.StatusAccepted)
	}
}
