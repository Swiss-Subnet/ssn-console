package server

import (
	"context"
	"testing"
	"time"

	"github.com/aviate-labs/agent-go/principal"
)

type fixedAuthorizer struct{}

func (fixedAuthorizer) ListUserReadableCanisters(_ context.Context, _ principal.Principal) ([]principal.Principal, error) {
	return nil, nil
}

func p(byte0 byte) principal.Principal {
	b := make([]byte, 29)
	b[0] = byte0
	return principal.Principal{Raw: b}
}

func TestAuthCache_RefillSweepsExpiredEntries(t *testing.T) {
	current := time.Unix(1700000000, 0)
	cache := newAuthCache(fixedAuthorizer{}, time.Minute)
	cache.now = func() time.Time { return current }

	if _, err := cache.allows(context.Background(), p(1), "x"); err != nil {
		t.Fatal(err)
	}
	if _, err := cache.allows(context.Background(), p(2), "x"); err != nil {
		t.Fatal(err)
	}
	if got := cache.len(); got != 2 {
		t.Fatalf("precondition: want 2 entries, got %d", got)
	}

	// Jump past expiry, then trigger a refill via a *third* principal. The
	// refill must also evict the two stale entries.
	current = current.Add(2 * time.Minute)
	if _, err := cache.allows(context.Background(), p(3), "x"); err != nil {
		t.Fatal(err)
	}
	if got := cache.len(); got != 1 {
		t.Fatalf("want 1 entry after sweep, got %d", got)
	}
}
