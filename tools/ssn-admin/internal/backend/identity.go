package backend

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/aviate-labs/agent-go/identity"
)

// RFC 8032 §7.1 Test 1 keypair: the local-replica fallback identity, matching
// the one init-local pre-grants admin on. Safe only on loopback; LoadIdentity
// refuses it against mainnet.
var rfc8032Test1Seed = mustHex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60")

// LoadIdentity returns the identity the CLI authenticates as. A non-empty PEM
// is used directly; otherwise the RFC 8032 test vector is used, but only when
// icHost is a local replica.
func LoadIdentity(pem, icHost string) (identity.Identity, error) {
	if strings.TrimSpace(pem) != "" {
		return parsePEM([]byte(pem))
	}
	if !isLocalReplica(icHost) {
		return nil, fmt.Errorf("ADMIN_IDENTITY_PEM is required when IC_HOST is not a local replica (got %q)", icHost)
	}
	priv := ed25519.NewKeyFromSeed(rfc8032Test1Seed)
	return identity.NewEd25519Identity(priv.Public().(ed25519.PublicKey), priv)
}

// parsePEM accepts whichever curve the operator's identity uses. dfx mints
// secp256k1 by default, but Ed25519 and prime256v1 PEMs are also valid, so try
// each rather than assuming one (a mismatch would only surface as a parse
// failure at call time).
func parsePEM(pem []byte) (identity.Identity, error) {
	if id, err := identity.NewEd25519IdentityFromPEM(pem); err == nil {
		return id, nil
	}
	if id, err := identity.NewSecp256k1IdentityFromPEM(pem); err == nil {
		return id, nil
	}
	if id, err := identity.NewPrime256v1IdentityFromPEM(pem); err == nil {
		return id, nil
	}
	return nil, fmt.Errorf("parse ADMIN_IDENTITY_PEM: unrecognized key (tried Ed25519, secp256k1, prime256v1)")
}

// LoadIdentityOptional is for read-only commands that need no authority: a
// non-empty PEM is honored, but an empty PEM yields the anonymous identity on
// any host (read_state of public paths needs no signer). Write commands use
// LoadIdentity, which still refuses an empty identity against mainnet.
func LoadIdentityOptional(pem, icHost string) (identity.Identity, error) {
	if strings.TrimSpace(pem) != "" {
		return LoadIdentity(pem, icHost)
	}
	if isLocalReplica(icHost) {
		return LoadIdentity(pem, icHost)
	}
	return new(identity.AnonymousIdentity), nil
}

func isLocalReplica(host string) bool {
	h := strings.ToLower(host)
	return strings.Contains(h, "127.0.0.1") ||
		strings.Contains(h, "localhost") ||
		strings.Contains(h, "0.0.0.0")
}

func mustHex(s string) []byte {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic("invalid hex constant: " + s)
	}
	return b
}
