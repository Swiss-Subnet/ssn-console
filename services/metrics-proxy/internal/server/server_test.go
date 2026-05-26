package server

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/aviate-labs/agent-go/principal"
	"github.com/swiss-subnet/ssn-console/services/httpsvc/iiauth"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/grafana"
)

type capturingQuerier struct {
	last grafana.QueryRangeRequest
	out  []grafana.Point
	err  error
}

func (c *capturingQuerier) QueryRange(_ context.Context, req grafana.QueryRangeRequest) ([]grafana.Point, error) {
	c.last = req
	return c.out, c.err
}

// stubAuthorizer returns a fixed allowlist regardless of which principal
// asks. Server tests use it together with signed iiauth requests so the
// handler sees a real verified principal but the canister query is
// stubbed out.
type stubAuthorizer struct {
	allow []principal.Principal
	err   error
}

func (s stubAuthorizer) ListUserReadableCanisters(_ context.Context, _ principal.Principal) ([]principal.Principal, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.allow, nil
}

// derWrapEd25519 builds the SPKI DER form expected by
// agent-go's PublicED25519KeyFromDER. Duplicated from iiauth tests
// because cross-package test helpers can't be shared.
var derEd25519Prefix = []byte{
	0x30, 0x2a,
	0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
	0x03, 0x21, 0x00,
}

func derWrapEd25519(pub ed25519.PublicKey) []byte {
	out := make([]byte, 0, len(derEd25519Prefix)+ed25519.PublicKeySize)
	out = append(out, derEd25519Prefix...)
	out = append(out, pub...)
	return out
}

const testOrigin = "http://localhost:4200"

func newTestServer(t *testing.T, q grafana.Querier, allowed ...principal.Principal) (http.Handler, time.Time) {
	t.Helper()
	now := time.Unix(1700000000, 0)
	srv := New(Deps{
		Querier:     q,
		FrontendURL: testOrigin,
		Authorizer:  stubAuthorizer{allow: allowed},
		IIAuth: iiauth.Config{
			Now:             func() time.Time { return now },
			SkewWindow:      60 * time.Second,
			AllowEmptyChain: true,
		},
	})
	return srv, now
}

// mintSession runs a POST /v1/session against srv with a freshly-signed
// empty delegation chain and returns the bearer token the server issues.
// Tests use this once per case, then attach the token via signedGet.
func mintSession(t *testing.T, srv http.Handler, now time.Time) string {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der := derWrapEd25519(pub)

	req := httptest.NewRequest(http.MethodPost, "/v1/session", nil)
	tsMillis := now.UnixMilli()
	challenge := iiauth.ChallengeBytes(req.Method, req.URL.Path, req.URL.RawQuery, tsMillis, der)
	sig := ed25519.Sign(priv, challenge)

	req.Header.Set(iiauth.HeaderDelegation, `{"delegations":[],"publicKey":"`+hex.EncodeToString(der)+`"}`)
	req.Header.Set(iiauth.HeaderSignature, hex.EncodeToString(sig))
	req.Header.Set(iiauth.HeaderTimestamp, strconv.FormatInt(tsMillis, 10))

	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("mint session: want 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode session response: %v", err)
	}
	if body.Token == "" {
		t.Fatal("session token missing in response")
	}
	return body.Token
}

func bearerGet(target, token string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, target, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// canisterPrincipal returns a synthetic 29-byte principal so range
// queries inside the repository tests fall in the MIN..=MAX range.
func canisterPrincipal(byte0 byte) principal.Principal {
	bytes := make([]byte, 29)
	bytes[0] = byte0
	return principal.Principal{Raw: bytes}
}

func TestStatusOK(t *testing.T) {
	srv, _ := newTestServer(t, &capturingQuerier{})
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/status", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rec.Code)
	}
}

func TestListMetrics_Authenticated(t *testing.T) {
	srv, now := newTestServer(t, &capturingQuerier{})
	token := mintSession(t, srv, now)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet("/v1/metrics", token))
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Metrics []struct {
			Slug string `json:"slug"`
		} `json:"metrics"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body.Metrics) == 0 {
		t.Fatal("expected at least one metric")
	}
}

func TestListMetrics_Unauthenticated(t *testing.T) {
	srv, _ := newTestServer(t, &capturingQuerier{})
	req := httptest.NewRequest(http.MethodGet, "/v1/metrics", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
}

func TestQueryRange_ForbiddenWhenCanisterNotInAuthorisedList(t *testing.T) {
	srv, now := newTestServer(t, &capturingQuerier{})
	token := mintSession(t, srv, now)
	target := "/v1/canisters/aaaaa-aa/metrics/memory-bytes"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestQueryRange_BadRequestForMalformedCanisterID(t *testing.T) {
	srv, now := newTestServer(t, &capturingQuerier{})
	token := mintSession(t, srv, now)
	target := "/v1/canisters/not-a-principal/metrics/memory-bytes"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestQueryRange_NotFoundForUnknownMetric(t *testing.T) {
	canister := canisterPrincipal(1)
	srv, now := newTestServer(t, &capturingQuerier{}, canister)
	token := mintSession(t, srv, now)
	target := "/v1/canisters/" + canister.String() + "/metrics/not-a-metric"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestQueryRange_HappyPathInjectsCanisterIDLabel(t *testing.T) {
	canister := canisterPrincipal(2)
	q := &capturingQuerier{
		out: []grafana.Point{{TS: 1700000000000, Value: 42}},
	}
	srv, now := newTestServer(t, q, canister)
	token := mintSession(t, srv, now)
	target := "/v1/canisters/" + canister.String() +
		"/metrics/memory-bytes?from=2024-01-01T00:00:00Z&to=2024-01-01T01:00:00Z&step=1m"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}
	wantQuery := `ic_canister_memory_bytes{canister_id="` + canister.String() + `"}`
	if q.last.Query != wantQuery {
		t.Fatalf("unexpected query: got %q want %q", q.last.Query, wantQuery)
	}
	if q.last.Step != time.Minute {
		t.Fatalf("unexpected step: got %s", q.last.Step)
	}
	var body rangeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Metric != "memory-bytes" || body.CanisterID != canister.String() || len(body.Points) != 1 {
		t.Fatalf("unexpected body: %+v", body)
	}
}

func TestQueryRange_RejectsRangeTooLarge(t *testing.T) {
	canister := canisterPrincipal(3)
	srv, now := newTestServer(t, &capturingQuerier{}, canister)
	token := mintSession(t, srv, now)
	target := "/v1/canisters/" + canister.String() +
		"/metrics/memory-bytes?from=2024-01-01T00:00:00Z&to=2024-06-01T00:00:00Z&step=1m"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", rec.Code)
	}
}

func TestQueryRange_RejectsToBeforeFrom(t *testing.T) {
	canister := canisterPrincipal(4)
	srv, now := newTestServer(t, &capturingQuerier{}, canister)
	token := mintSession(t, srv, now)
	target := "/v1/canisters/" + canister.String() +
		"/metrics/memory-bytes?from=2024-01-02T00:00:00Z&to=2024-01-01T00:00:00Z"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", rec.Code)
	}
}

func TestQueryRange_BadGatewayOnUpstreamError(t *testing.T) {
	canister := canisterPrincipal(5)
	q := &capturingQuerier{err: errStub{}}
	srv, now := newTestServer(t, q, canister)
	token := mintSession(t, srv, now)
	target := "/v1/canisters/" + canister.String() + "/metrics/memory-bytes"
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, bearerGet(target, token))
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("want 502, got %d", rec.Code)
	}
}

type errStub struct{}

func (errStub) Error() string { return "stub" }
