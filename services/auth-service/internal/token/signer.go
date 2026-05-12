package token

import (
	"crypto"
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

type Signer struct {
	signer jose.Signer
	now    func() time.Time
}

type Options struct {
	// PrivateKeyPEM is a PKCS#8 Ed25519 private key in PEM form.
	PrivateKeyPEM string
	// Now overrides the clock; tests can pin it. nil means time.Now.
	Now func() time.Time
}

func NewSigner(opts Options) (*Signer, error) {
	key, err := parseEd25519PrivateKey(opts.PrivateKeyPEM)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.EdDSA, Key: key},
		(&jose.SignerOptions{}).WithType("JWT"),
	)
	if err != nil {
		return nil, fmt.Errorf("new signer: %w", err)
	}
	now := opts.Now
	if now == nil {
		now = time.Now
	}
	return &Signer{signer: signer, now: now}, nil
}

// SignEmailVerification mints a short-lived JWT carrying the email claim.
func (s *Signer) SignEmailVerification(email string, ttl time.Duration) (string, error) {
	now := s.now()
	claims := jwt.Claims{
		IssuedAt: jwt.NewNumericDate(now),
		Expiry:   jwt.NewNumericDate(now.Add(ttl)),
	}
	private := struct {
		Email string `json:"email"`
	}{Email: email}

	return jwt.Signed(s.signer).Claims(claims).Claims(private).Serialize()
}

func parseEd25519PrivateKey(pemStr string) (crypto.Signer, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, errors.New("PEM decode failed")
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	ed, ok := key.(ed25519.PrivateKey)
	if !ok {
		return nil, errors.New("not an Ed25519 private key")
	}
	return ed, nil
}
