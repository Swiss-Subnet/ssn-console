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
func LoadIdentity(pem, icHost string) (*identity.Ed25519Identity, error) {
	if strings.TrimSpace(pem) != "" {
		id, err := identity.NewEd25519IdentityFromPEM([]byte(pem))
		if err != nil {
			return nil, fmt.Errorf("parse ADMIN_IDENTITY_PEM: %w", err)
		}
		return id, nil
	}
	if !isLocalReplica(icHost) {
		return nil, fmt.Errorf("ADMIN_IDENTITY_PEM is required when IC_HOST is not a local replica (got %q)", icHost)
	}
	priv := ed25519.NewKeyFromSeed(rfc8032Test1Seed)
	return identity.NewEd25519Identity(priv.Public().(ed25519.PublicKey), priv)
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
