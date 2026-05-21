package payrexx

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

const (
	testInstance = "testshop"
	testSecret   = "shhh-very-secret"
)

func expectedSig(t *testing.T, payload string) string {
	t.Helper()
	mac := hmac.New(sha256.New, []byte(testSecret))
	mac.Write([]byte(payload))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func TestSignatureCheck_GET_signsEmptyPayload(t *testing.T) {
	var (
		gotMethod string
		gotPath   string
		gotQuery  url.Values
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotQuery = r.URL.Query()
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)
	status, err := c.SignatureCheck(context.Background())
	if err != nil {
		t.Fatalf("SignatureCheck: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("status = %d, want 200", status)
	}
	if gotMethod != http.MethodGet {
		t.Errorf("method = %q, want GET", gotMethod)
	}
	if gotPath != "/SignatureCheck/" {
		t.Errorf("path = %q, want /SignatureCheck/", gotPath)
	}
	if got := gotQuery.Get("instance"); got != testInstance {
		t.Errorf("instance query = %q, want %q", got, testInstance)
	}
	if got, want := gotQuery.Get("ApiSignature"), expectedSig(t, ""); got != want {
		t.Errorf("ApiSignature = %q, want %q (HMAC of empty payload)", got, want)
	}
}

func TestDo_POST_signsFormBody(t *testing.T) {
	var (
		gotContentType string
		gotBody        string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotContentType = r.Header.Get("Content-Type")
		raw, _ := io.ReadAll(r.Body)
		gotBody = string(raw)
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"status":"success"}`))
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)

	form := make(url.Values)
	form.Set("amount", "1000")
	form.Set("currency", "CHF")

	body, status, err := c.Do(context.Background(), http.MethodPost, "/Gateway/", form)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if status != http.StatusCreated {
		t.Fatalf("status = %d, want 201", status)
	}
	if !strings.Contains(string(body), `"status":"success"`) {
		t.Errorf("body = %q, want success payload", string(body))
	}

	if gotContentType != "application/x-www-form-urlencoded" {
		t.Errorf("Content-Type = %q, want application/x-www-form-urlencoded", gotContentType)
	}

	parsed, err := url.ParseQuery(gotBody)
	if err != nil {
		t.Fatalf("parse received body: %v", err)
	}
	if parsed.Get("amount") != "1000" || parsed.Get("currency") != "CHF" {
		t.Errorf("body fields = %v, want amount=1000 currency=CHF", parsed)
	}

	gotSig := parsed.Get("ApiSignature")
	if gotSig == "" {
		t.Fatalf("ApiSignature missing from body")
	}
	// The signature must be over the unsigned form body (form fields only,
	// in the order url.Values.Encode produces). Reconstruct and compare.
	signed := url.Values{}
	for k, vs := range parsed {
		if k == "ApiSignature" {
			continue
		}
		for _, v := range vs {
			signed.Add(k, v)
		}
	}
	if want := expectedSig(t, signed.Encode()); gotSig != want {
		t.Errorf("ApiSignature = %q, want %q", gotSig, want)
	}
}

// Hard-coded so a change in how production builds the signed payload
// can't silently co-vary with a test that recomputes it the same way.
func TestDo_POST_pinnedSignature(t *testing.T) {
	const wantSig = "vixLyDWgvhyZ1fuh8bk1i8YrJY0HfL3U7ZfhJVF7z+o="

	var gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		gotBody = string(raw)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)
	form := make(url.Values)
	form.Set("amount", "1000")
	if _, _, err := c.Do(context.Background(), http.MethodPost, "/Gateway/", form); err != nil {
		t.Fatalf("Do: %v", err)
	}
	parsed, err := url.ParseQuery(gotBody)
	if err != nil {
		t.Fatalf("parse body: %v", err)
	}
	if got := parsed.Get("ApiSignature"); got != wantSig {
		t.Errorf("ApiSignature = %q, want %q", got, wantSig)
	}
}

func TestDo_POST_stripsCallerProvidedApiSignature(t *testing.T) {
	var gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		gotBody = string(raw)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)
	form := make(url.Values)
	form.Set("amount", "1000")
	form.Set("ApiSignature", "attacker-supplied")

	if _, _, err := c.Do(context.Background(), http.MethodPost, "/Gateway/", form); err != nil {
		t.Fatalf("Do: %v", err)
	}
	parsed, err := url.ParseQuery(gotBody)
	if err != nil {
		t.Fatalf("parse body: %v", err)
	}
	if sigs := parsed["ApiSignature"]; len(sigs) != 1 {
		t.Fatalf("ApiSignature count = %d (%v), want exactly 1", len(sigs), sigs)
	}
	want := expectedSig(t, "amount=1000")
	if got := parsed.Get("ApiSignature"); got != want {
		t.Errorf("ApiSignature = %q, want %q (client-computed, caller value stripped)", got, want)
	}
}

func TestDo_GET_stripsCallerProvidedApiSignature(t *testing.T) {
	var gotQuery url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query()
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)
	form := make(url.Values)
	form.Set("ApiSignature", "attacker-supplied")

	if _, _, err := c.Do(context.Background(), http.MethodGet, "/Transaction/", form); err != nil {
		t.Fatalf("Do: %v", err)
	}
	if sigs := gotQuery["ApiSignature"]; len(sigs) != 1 {
		t.Fatalf("ApiSignature count = %d (%v), want exactly 1", len(sigs), sigs)
	}
	if got, want := gotQuery.Get("ApiSignature"), expectedSig(t, ""); got != want {
		t.Errorf("ApiSignature = %q, want %q (client-computed empty-payload signature)", got, want)
	}
}

func TestDo_GET_appendsExtraFormValuesToQuery(t *testing.T) {
	var gotQuery url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query()
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, testInstance, testSecret)
	form := make(url.Values)
	form.Set("status", "confirmed")

	_, _, err := c.Do(context.Background(), http.MethodGet, "/Transaction/", form)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if got := gotQuery.Get("status"); got != "confirmed" {
		t.Errorf("status query = %q, want confirmed", got)
	}
	if got := gotQuery.Get("instance"); got != testInstance {
		t.Errorf("instance query = %q, want %q", got, testInstance)
	}
	if gotQuery.Get("ApiSignature") == "" {
		t.Errorf("ApiSignature missing from query")
	}
}
