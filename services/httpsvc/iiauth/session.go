package iiauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/aviate-labs/agent-go/principal"
)

// SessionStore exchanges short-lived opaque tokens for verified caller
// principals. The full delegation-chain verification runs once at token
// mint; subsequent requests just present the token and the proxy looks up
// the principal.
type SessionStore struct {
	ttl time.Duration
	now func() time.Time

	mu       sync.Mutex
	sessions map[string]sessionEntry
}

type sessionEntry struct {
	principal principal.Principal
	expiresAt time.Time
}

func NewSessionStore(ttl time.Duration, now func() time.Time) *SessionStore {
	if now == nil {
		now = time.Now
	}
	return &SessionStore{
		ttl:      ttl,
		now:      now,
		sessions: map[string]sessionEntry{},
	}
}

// Mint binds a fresh token to p; the error is from the system RNG.
func (s *SessionStore) Mint(p principal.Principal) (string, time.Time, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(buf[:])
	now := s.now()
	expiresAt := now.Add(s.ttl)
	s.mu.Lock()
	for k, e := range s.sessions {
		if !now.Before(e.expiresAt) {
			delete(s.sessions, k)
		}
	}
	s.sessions[token] = sessionEntry{principal: p, expiresAt: expiresAt}
	s.mu.Unlock()
	return token, expiresAt, nil
}

// Len counts stored entries, including any expired since the last sweep.
func (s *SessionStore) Len() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.sessions)
}

// Lookup returns the principal for token, or (zero, false) if the token
// is unknown or expired. Expired entries are removed lazily on lookup.
func (s *SessionStore) Lookup(token string) (principal.Principal, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.sessions[token]
	if !ok {
		return principal.Principal{}, false
	}
	if !s.now().Before(entry.expiresAt) {
		delete(s.sessions, token)
		return principal.Principal{}, false
	}
	return entry.principal, true
}

// SessionMiddleware authenticates requests via Authorization: Bearer
// <token>, where <token> was issued by a prior MintSessionHandler call.
// On success, the caller principal is attached to the request context;
// PrincipalFromContext(r.Context()) yields it.
func SessionMiddleware(store *SessionStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r)
		if !ok {
			http.Error(w, "missing or malformed Authorization header", http.StatusUnauthorized)
			return
		}
		p, ok := store.Lookup(token)
		if !ok {
			http.Error(w, "session expired or unknown", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), principalCtxKey, p)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return "", false
	}
	tok := strings.TrimSpace(h[len(prefix):])
	if tok == "" {
		return "", false
	}
	return tok, true
}
