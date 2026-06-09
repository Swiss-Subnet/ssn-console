package server

import (
	"context"
	"sync"
	"time"

	"github.com/aviate-labs/agent-go/principal"
)

// authCache: principal -> allowed canisters, short TTL (~60s). Sits
// behind iiauth.SessionStore (which caches identity at ~15min). Separate
// TTLs because ownership changes must propagate faster than sessions.
type authCache struct {
	az  Authorizer
	ttl time.Duration
	now func() time.Time

	mu  sync.Mutex
	out map[string]authCacheEntry
}

type authCacheEntry struct {
	expiresAt   time.Time
	canisterIDs map[string]struct{}
}

func newAuthCache(az Authorizer, ttl time.Duration) *authCache {
	return &authCache{
		az:  az,
		ttl: ttl,
		now: time.Now,
		out: map[string]authCacheEntry{},
	}
}

func (c *authCache) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.out)
}

// allows reports whether canisterID is in the user's authorised set. A
// cache miss triggers a single Authorizer call; concurrent misses for the
// same principal race but the cost is just a duplicate query.
func (c *authCache) allows(ctx context.Context, user principal.Principal, canisterID string) (bool, error) {
	key := user.String()
	now := c.now()

	c.mu.Lock()
	entry, ok := c.out[key]
	c.mu.Unlock()
	if ok && now.Before(entry.expiresAt) {
		_, allowed := entry.canisterIDs[canisterID]
		return allowed, nil
	}

	list, err := c.az.ListUserReadableCanisters(ctx, user)
	if err != nil {
		return false, err
	}
	set := make(map[string]struct{}, len(list))
	for _, p := range list {
		set[p.String()] = struct{}{}
	}

	c.mu.Lock()
	for k, e := range c.out {
		if !now.Before(e.expiresAt) {
			delete(c.out, k)
		}
	}
	c.out[key] = authCacheEntry{
		expiresAt:   now.Add(c.ttl),
		canisterIDs: set,
	}
	c.mu.Unlock()

	_, allowed := set[canisterID]
	return allowed, nil
}
