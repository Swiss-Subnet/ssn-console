//go:build live

// Package livetest contains tests that hit the real Payrexx API. They are
// gated behind the `live` build tag so a vanilla `go test ./...` skips
// them entirely; only `go test -tags=live ./...` runs them.
//
// Required environment variables:
//
//	PAYREXX_LIVE_INSTANCE   merchant instance name
//	PAYREXX_LIVE_SECRET     API secret for that instance
//
// Optional:
//
//	PAYREXX_LIVE_BASE_URL   defaults to https://api.payrexx.com/v1.0
//
// Tests skip (rather than fail) if the required env vars are absent, so a
// CI run with -tags=live but without credentials behaves predictably.
package livetest_test

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/payrexx"
)

func newLiveClient(t *testing.T) *payrexx.Client {
	t.Helper()
	instance := os.Getenv("PAYREXX_LIVE_INSTANCE")
	secret := os.Getenv("PAYREXX_LIVE_SECRET")
	if instance == "" || secret == "" {
		t.Skip("PAYREXX_LIVE_INSTANCE / PAYREXX_LIVE_SECRET not set; skipping live test")
	}
	baseURL := os.Getenv("PAYREXX_LIVE_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.payrexx.com/v1.0"
	}
	return payrexx.NewClient(baseURL, instance, secret)
}

// TestSignatureCheck_live is the single most important contract test we can
// run: if our HMAC payload, encoding, or query/body placement drifts from
// what Payrexx expects, this fails and every other endpoint fails too.
// Running it against a real instance is the only way to catch that drift.
func TestSignatureCheck_live(t *testing.T) {
	c := newLiveClient(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	status, err := c.SignatureCheck(ctx)
	if err != nil {
		t.Fatalf("SignatureCheck: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("SignatureCheck status = %d, want 200 (signature is wrong, or instance/secret are mismatched)", status)
	}
}

// TestListTransactions_live verifies two things SignatureCheck does not:
// that GET requests to a non-trivial endpoint succeed, and that the
// response body matches the documented {status, data, message} envelope.
// An empty data array on a fresh instance is a valid result; we only
// assert the envelope parses and reports status="success".
func TestListTransactions_live(t *testing.T) {
	c := newLiveClient(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	body, status, err := c.Do(ctx, http.MethodGet, "/Transaction/", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("status = %d, body=%s", status, body)
	}

	env, err := payrexx.DecodeEnvelope(body)
	if err != nil {
		t.Fatalf("DecodeEnvelope: %v", err)
	}
	if env.Status != "success" {
		t.Fatalf("envelope.Status = %q, want success (message=%q)", env.Status, env.Message)
	}

	// Data is documented as an array; confirm it parses as one even when
	// empty. This pins the contract more precisely than just checking
	// status, and catches the case where Payrexx changes the shape from
	// array to object for this endpoint.
	var data []json.RawMessage
	if err := json.Unmarshal(env.Data, &data); err != nil {
		t.Fatalf("data is not a JSON array: %v (raw=%s)", err, env.Data)
	}
	t.Logf("ListTransactions returned %d transaction(s)", len(data))
}
