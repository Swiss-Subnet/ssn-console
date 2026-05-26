package httpsvc

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

const testOrigin = "http://localhost:4200"

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestWithCORS_AllowsMatchingOrigin(t *testing.T) {
	h := WithCORS(okHandler(), testOrigin)
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", testOrigin)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
		t.Fatalf("want ACAO=%q, got %q", testOrigin, got)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Fatalf("want Vary=Origin, got %q", got)
	}
}

func TestWithCORS_RejectsMismatchedOrigin(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true })
	h := WithCORS(next, testOrigin)
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d", rec.Code)
	}
	if called {
		t.Fatal("inner handler must not run for rejected origins")
	}
}

func TestWithCORS_AllowsNoOrigin(t *testing.T) {
	h := WithCORS(okHandler(), testOrigin)
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200 for no-Origin request, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("ACAO must not be set for no-Origin requests, got %q", got)
	}
}

func TestPreflight_AllowsMatchingOrigin(t *testing.T) {
	h := Preflight(PreflightOpts{AllowedOrigin: testOrigin, Methods: []string{http.MethodPost}})
	req := httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", testOrigin)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("want 204, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got != "POST, OPTIONS" {
		t.Fatalf("want methods 'POST, OPTIONS', got %q", got)
	}
}

func TestPreflight_RejectsMismatchedOrigin(t *testing.T) {
	h := Preflight(PreflightOpts{AllowedOrigin: testOrigin, Methods: []string{http.MethodPost}})
	req := httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d", rec.Code)
	}
}

func TestPreflight_JoinsMultipleMethods(t *testing.T) {
	h := Preflight(PreflightOpts{AllowedOrigin: testOrigin, Methods: []string{http.MethodGet, http.MethodPost}})
	req := httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", testOrigin)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got != "GET, POST, OPTIONS" {
		t.Fatalf("unexpected methods header: %q", got)
	}
}
