package iiauth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/aviate-labs/agent-go/principal"
)

func testPrincipal(byte0 byte) principal.Principal {
	bytes := make([]byte, 29)
	bytes[0] = byte0
	return principal.Principal{Raw: bytes}
}

func TestSessionStore_MintLookupRoundtrip(t *testing.T) {
	now := time.Unix(1700000000, 0)
	store := NewSessionStore(10*time.Minute, func() time.Time { return now })
	p := testPrincipal(1)
	tok, _, err := store.Mint(p)
	if err != nil {
		t.Fatal(err)
	}
	got, ok := store.Lookup(tok)
	if !ok {
		t.Fatal("token should be valid immediately after mint")
	}
	if got.String() != p.String() {
		t.Fatalf("principal mismatch:\n got %s\nwant %s", got, p)
	}
}

func TestSessionStore_LookupRejectsExpired(t *testing.T) {
	current := time.Unix(1700000000, 0)
	store := NewSessionStore(time.Minute, func() time.Time { return current })
	tok, _, err := store.Mint(testPrincipal(1))
	if err != nil {
		t.Fatal(err)
	}
	current = current.Add(2 * time.Minute)
	if _, ok := store.Lookup(tok); ok {
		t.Fatal("token should be expired after TTL")
	}
}

func TestSessionStore_LookupRejectsUnknown(t *testing.T) {
	store := NewSessionStore(time.Minute, nil)
	if _, ok := store.Lookup("not-a-real-token"); ok {
		t.Fatal("unknown token must not resolve")
	}
}

func TestSessionMiddleware_HappyPath(t *testing.T) {
	store := NewSessionStore(time.Minute, nil)
	p := testPrincipal(2)
	tok, _, _ := store.Mint(p)

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		got, ok := PrincipalFromContext(r.Context())
		if !ok {
			http.Error(w, "no principal", http.StatusInternalServerError)
			return
		}
		if got.String() != p.String() {
			t.Errorf("middleware leaked wrong principal: got %s want %s", got, p)
		}
		w.WriteHeader(http.StatusOK)
	})

	h := SessionMiddleware(store, next)
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !called {
		t.Fatal("inner handler should run on valid token")
	}
}

func TestSessionMiddleware_RejectsMissingHeader(t *testing.T) {
	store := NewSessionStore(time.Minute, nil)
	h := SessionMiddleware(store, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("inner handler must not run without Authorization")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
}

func TestSessionStore_MintSweepsExpiredEntries(t *testing.T) {
	current := time.Unix(1700000000, 0)
	store := NewSessionStore(time.Minute, func() time.Time { return current })
	if _, _, err := store.Mint(testPrincipal(10)); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Mint(testPrincipal(11)); err != nil {
		t.Fatal(err)
	}
	if got := store.Len(); got != 2 {
		t.Fatalf("precondition: want 2 entries, got %d", got)
	}

	// Jump past both tokens' expiry and mint a fresh one. The new mint must
	// also prune the two stale entries so the store does not grow without
	// bound under churn.
	current = current.Add(2 * time.Minute)
	if _, _, err := store.Mint(testPrincipal(12)); err != nil {
		t.Fatal(err)
	}
	if got := store.Len(); got != 1 {
		t.Fatalf("want 1 entry after sweep, got %d", got)
	}
}

func TestSessionMiddleware_RejectsExpiredToken(t *testing.T) {
	current := time.Unix(1700000000, 0)
	store := NewSessionStore(time.Minute, func() time.Time { return current })
	tok, _, _ := store.Mint(testPrincipal(3))
	current = current.Add(2 * time.Minute)

	h := SessionMiddleware(store, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("inner handler must not run on expired token")
	}))
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
}
