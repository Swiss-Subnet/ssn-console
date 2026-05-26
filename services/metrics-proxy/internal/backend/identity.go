package backend

import (
	"crypto/ed25519"
	"fmt"
	"os"
	"strings"

	"github.com/aviate-labs/agent-go/identity"
)

// RFC 8032 §7.1 Test 1: a well-known Ed25519 keypair published in the
// spec. We use it as the local-replica fallback identity so dev setup
// scripts can pre-grant READ_METRICS to a fixed, predictable principal
// without committing a PEM file. Anyone who reads the RFC has this key —
// safe only because LoadIdentity refuses to use it outside loopback.
//
//	private: 9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60
//	public:  d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a
var (
	rfc8032Test1Seed = mustHex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60")
)

// LoadIdentity returns the identity to authenticate the proxy as. If
// pemPath is non-empty, the PEM at that path is loaded. Otherwise the
// RFC 8032 test vector is used — but only when ICHost looks like a local
// replica; pointing the proxy at mainnet without a real PEM is rejected.
func LoadIdentity(pemPath, icHost string) (*identity.Ed25519Identity, error) {
	if pemPath != "" {
		pem, err := os.ReadFile(pemPath)
		if err != nil {
			return nil, fmt.Errorf("read pem %s: %w", pemPath, err)
		}
		id, err := identity.NewEd25519IdentityFromPEM(pem)
		if err != nil {
			return nil, fmt.Errorf("parse pem %s: %w", pemPath, err)
		}
		return id, nil
	}

	if !isLocalReplica(icHost) {
		return nil, fmt.Errorf(
			"PROXY_IDENTITY_PEM is required when IC_HOST is not a local replica (got %q)",
			icHost,
		)
	}

	priv := ed25519.NewKeyFromSeed(rfc8032Test1Seed)
	pub := priv.Public().(ed25519.PublicKey)
	return identity.NewEd25519Identity(pub, priv)
}

func isLocalReplica(host string) bool {
	h := strings.ToLower(host)
	return strings.Contains(h, "127.0.0.1") ||
		strings.Contains(h, "localhost") ||
		strings.Contains(h, "0.0.0.0")
}

func mustHex(s string) []byte {
	out := make([]byte, len(s)/2)
	for i := 0; i < len(out); i++ {
		var b byte
		for j := 0; j < 2; j++ {
			c := s[i*2+j]
			b <<= 4
			switch {
			case c >= '0' && c <= '9':
				b |= c - '0'
			case c >= 'a' && c <= 'f':
				b |= c - 'a' + 10
			default:
				panic("invalid hex constant: " + s)
			}
		}
		out[i] = b
	}
	return out
}
