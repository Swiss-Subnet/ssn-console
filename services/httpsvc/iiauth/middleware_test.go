package iiauth

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/aviate-labs/agent-go/principal"
)

func newPassThrough() (http.Handler, *bool) {
	called := false
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		if _, ok := PrincipalFromContext(r.Context()); !ok {
			http.Error(w, "no principal", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	return h, &called
}

// emptyChainJSON returns the hex-encoded JSON form of a DelegationChain
// with no delegations and a given root public key. agent-go's
// ii.HexString unmarshals from hex but its default Marshal does not
// produce hex, so we build the JSON by hand.
func emptyChainJSON(der []byte) string {
	return `{"delegations":[],"publicKey":"` + hex.EncodeToString(der) + `"}`
}

func signedRequest(t *testing.T, fixedNow time.Time, method, path, rawQuery string) *http.Request {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der := derWrapEd25519(pub)

	tsMillis := fixedNow.UnixMilli()
	challenge := ChallengeBytes(method, path, rawQuery, tsMillis, der)
	sig := ed25519.Sign(priv, challenge)

	target := path
	if rawQuery != "" {
		target += "?" + rawQuery
	}
	req := httptest.NewRequest(method, target, nil)
	req.Header.Set(HeaderDelegation, emptyChainJSON(der))
	req.Header.Set(HeaderSignature, hex.EncodeToString(sig))
	req.Header.Set(HeaderTimestamp, strconv.FormatInt(tsMillis, 10))
	return req
}

func TestMiddleware_HappyPath_EmptyChain(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{Now: func() time.Time { return now }, SkewWindow: 60 * time.Second, AllowEmptyChain: true}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	req := signedRequest(t, now, http.MethodGet, "/x", "")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !*called {
		t.Fatal("inner handler should have been called")
	}
}

func TestMiddleware_RejectsExpiredTimestamp(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{Now: func() time.Time { return now }, SkewWindow: 30 * time.Second, AllowEmptyChain: true}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	stale := now.Add(-2 * time.Minute)
	req := signedRequest(t, stale, http.MethodGet, "/x", "")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	if *called {
		t.Fatal("inner handler must not run for stale timestamps")
	}
}

func TestMiddleware_RejectsMissingHeaders(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{Now: func() time.Time { return now }, SkewWindow: 60 * time.Second, AllowEmptyChain: true}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	if *called {
		t.Fatal("handler must not run when headers are missing")
	}
}

func TestMiddleware_RejectsBadSignature(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{Now: func() time.Time { return now }, SkewWindow: 60 * time.Second, AllowEmptyChain: true}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	req := signedRequest(t, now, http.MethodGet, "/x", "")
	// Corrupt the signature: flip a byte.
	sigHex := req.Header.Get(HeaderSignature)
	sigBytes, _ := hex.DecodeString(sigHex)
	sigBytes[0] ^= 0xff
	req.Header.Set(HeaderSignature, hex.EncodeToString(sigBytes))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	if *called {
		t.Fatal("handler must not run for bad signatures")
	}
}

func TestMiddleware_RejectsEmptyChainByDefault(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{
		Now:           func() time.Time { return now },
		SkewWindow:    60 * time.Second,
		IICanisterID:  principal.Principal{Raw: []byte{0x01}},
		RootPublicKey: []byte{0x02},
	}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	req := signedRequest(t, now, http.MethodGet, "/x", "")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	if *called {
		t.Fatal("handler must not run for empty chain when AllowEmptyChain is false")
	}
}

func TestConfig_Validate(t *testing.T) {
	canister := principal.Principal{Raw: []byte{0x01}}
	rootKey := []byte{0x02}
	cases := []struct {
		name    string
		cfg     Config
		wantErr bool
	}{
		{"prod fully configured", Config{IICanisterID: canister, RootPublicKey: rootKey}, false},
		{"missing canister", Config{RootPublicKey: rootKey}, true},
		{"missing root key", Config{IICanisterID: canister}, true},
		{"AllowEmptyChain waives canister/root", Config{AllowEmptyChain: true}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.cfg.Validate()
			if tc.wantErr && err == nil {
				t.Fatal("want error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("want no error, got %v", err)
			}
		})
	}
}

func TestMiddleware_RejectsTamperedPath(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cfg := Config{Now: func() time.Time { return now }, SkewWindow: 60 * time.Second, AllowEmptyChain: true}
	next, called := newPassThrough()
	h := Middleware(cfg, next)

	// Build a signature for one path then route it to a different path:
	// the challenge binding must reject this.
	req := signedRequest(t, now, http.MethodGet, "/expected", "")
	req.URL.Path = "/tampered"

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	if *called {
		t.Fatal("handler must not run for tampered paths")
	}
}
