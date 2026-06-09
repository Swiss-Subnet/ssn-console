package iiauth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/aviate-labs/agent-go/certification/ii"
	"github.com/aviate-labs/agent-go/principal"
)

const (
	HeaderDelegation = "X-IC-Delegation"
	HeaderSignature  = "X-IC-Signature"
	HeaderTimestamp  = "X-IC-Timestamp"
)

type Config struct {
	IICanisterID  principal.Principal
	RootPublicKey []byte
	// SkewWindow bounds how stale the client-side timestamp may be.
	// 60s is a sensible default; widen only if clients have known clock
	// drift problems.
	SkewWindow time.Duration
	// Now is injectable for tests; defaults to time.Now.
	Now func() time.Time
	// AllowEmptyChain permits raw self-authenticating principals (no II
	// delegation). Production must leave this false so only II-anchored
	// callers authenticate; tests flip it to avoid needing canister-sig
	// fixtures.
	AllowEmptyChain bool
}

// Validate fails fast on misconfigured production deployments: a zero
// IICanisterID or empty RootPublicKey combined with non-empty chains
// would silently accept forged signatures. AllowEmptyChain waives the
// requirement because empty chains bypass the canister-sig path entirely.
func (c Config) Validate() error {
	if c.AllowEmptyChain {
		return nil
	}
	if len(c.IICanisterID.Raw) == 0 {
		return errors.New("iiauth: IICanisterID must be set")
	}
	if len(c.RootPublicKey) == 0 {
		return errors.New("iiauth: RootPublicKey must be set")
	}
	return nil
}

type ctxKey int

const principalCtxKey ctxKey = iota

// PrincipalFromContext returns the caller principal attached by Middleware.
func PrincipalFromContext(ctx context.Context) (principal.Principal, bool) {
	p, ok := ctx.Value(principalCtxKey).(principal.Principal)
	return p, ok
}

// ChallengeBytes builds the byte sequence the client must sign and the
// proxy must verify. chainPubKey is the DER-encoded root pubkey of the
// delegation chain; hashing it into the challenge prevents replay where a
// captured (signature, ts) pair gets re-paired with a different chain.
func ChallengeBytes(method, path, query string, timestampMillis int64, chainPubKey []byte) []byte {
	keyHash := sha256.Sum256(chainPubKey)
	return fmt.Appendf(nil, "%s\n%s\n%s\n%d\n%s", method, path, query, timestampMillis, hex.EncodeToString(keyHash[:]))
}

// Middleware wraps next so each request first proves its caller principal
// via the IC delegation chain + a signed challenge. On success the
// principal is attached to the request context; on failure the request is
// rejected with 401 and next is not called.
//
// Panics on cfg.Validate() failure: misconfigured authn at startup is
// safer than a process that runs and silently accepts forged signatures.
func Middleware(cfg Config, next http.Handler) http.Handler {
	if err := cfg.Validate(); err != nil {
		panic(err)
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	skew := cfg.SkewWindow
	if skew == 0 {
		skew = 60 * time.Second
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tsStr := r.Header.Get(HeaderTimestamp)
		if tsStr == "" {
			http.Error(w, "missing "+HeaderTimestamp, http.StatusUnauthorized)
			return
		}
		tsMillis, err := strconv.ParseInt(tsStr, 10, 64)
		if err != nil {
			http.Error(w, "invalid "+HeaderTimestamp, http.StatusUnauthorized)
			return
		}
		clientTime := time.UnixMilli(tsMillis)
		if d := now().Sub(clientTime); d > skew || d < -skew {
			http.Error(w, "timestamp outside skew window", http.StatusUnauthorized)
			return
		}

		delegationHdr := r.Header.Get(HeaderDelegation)
		if delegationHdr == "" {
			http.Error(w, "missing "+HeaderDelegation, http.StatusUnauthorized)
			return
		}
		var dc ii.DelegationChain
		if err := json.Unmarshal([]byte(delegationHdr), &dc); err != nil {
			http.Error(w, "invalid "+HeaderDelegation, http.StatusUnauthorized)
			return
		}
		if !cfg.AllowEmptyChain && len(dc.Delegations) == 0 {
			http.Error(w, "empty delegation chain rejected; II login required", http.StatusUnauthorized)
			return
		}

		sigHex := r.Header.Get(HeaderSignature)
		if sigHex == "" {
			http.Error(w, "missing "+HeaderSignature, http.StatusUnauthorized)
			return
		}
		sig, err := hex.DecodeString(sigHex)
		if err != nil {
			http.Error(w, "invalid "+HeaderSignature, http.StatusUnauthorized)
			return
		}

		nowNS := uint64(now().UnixNano())
		callerPrincipal, sessionPubKey, err := VerifyDelegationChain(dc, nowNS, cfg.IICanisterID, cfg.RootPublicKey)
		if err != nil {
			http.Error(w, "delegation chain: "+err.Error(), http.StatusUnauthorized)
			return
		}

		challenge := ChallengeBytes(r.Method, r.URL.Path, r.URL.RawQuery, tsMillis, []byte(dc.PublicKey))
		if err := VerifyChallengeSignature(sessionPubKey, challenge, sig); err != nil {
			http.Error(w, "challenge: "+err.Error(), http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), principalCtxKey, callerPrincipal)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
