package canister

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"

	"github.com/aviate-labs/agent-go/identity"
)

// IdentityFromPEM parses a PKCS#8 Ed25519 private key (same PRIVATE_KEY the
// auth-service signs with) into an agent-go identity, so the syncer calls the
// backend canister as the principal record_usage authorizes. The env value may
// carry surrounding quotes and escaped newlines from quadlet/.env quoting.
func IdentityFromPEM(raw string) (*identity.Ed25519Identity, error) {
	cleaned := strings.ReplaceAll(strings.Trim(raw, `"`), `\n`, "\n")
	block, _ := pem.Decode([]byte(cleaned))
	if block == nil {
		return nil, errors.New("PEM decode failed")
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse pkcs8: %w", err)
	}
	priv, ok := key.(ed25519.PrivateKey)
	if !ok {
		return nil, errors.New("not an Ed25519 private key")
	}
	pub := priv.Public().(ed25519.PublicKey)
	return identity.NewEd25519Identity(pub, priv)
}
