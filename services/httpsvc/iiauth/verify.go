package iiauth

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"fmt"

	"github.com/aviate-labs/agent-go/certification"
	"github.com/aviate-labs/agent-go/certification/hashtree"
	"github.com/aviate-labs/agent-go/certification/ii"
	"github.com/aviate-labs/agent-go/principal"
	"github.com/fxamacker/cbor/v2"
)

// VerifyDelegationChain walks a multi-link Internet Identity delegation
// chain and returns the principal it authorizes plus the leaf session
// public key (DER-encoded). The session key is returned so the caller can
// verify a per-request challenge signature against it.
//
// Single-link chains (root identity == session key) are valid: an empty
// chain returns the principal derived from dc.PublicKey.
//
// rootPublicKey must be the IC root public key (mainnet or local replica).
// iiCanisterID is the principal of the Internet Identity canister whose
// signature anchors the chain.
func VerifyDelegationChain(
	dc ii.DelegationChain,
	currentTimeNS uint64,
	iiCanisterID principal.Principal,
	rootPublicKey []byte,
) (principal.Principal, []byte, error) {
	if len(dc.Delegations) == 0 {
		return principal.NewSelfAuthenticating([]byte(dc.PublicKey)), []byte(dc.PublicKey), nil
	}

	// dc.PublicKey is the canister-signature DER pubkey of the root
	// identity (II for normal logins). It signs the first delegation.
	canisterSig, err := ii.CanisterSigPublicKeyFromDER([]byte(dc.PublicKey))
	if err != nil {
		return principal.Principal{}, nil, fmt.Errorf("parse root pubkey: %w", err)
	}
	if !bytes.Equal(canisterSig.CanisterID.Raw, iiCanisterID.Raw) {
		return principal.Principal{}, nil, fmt.Errorf("delegation not anchored to expected II canister")
	}

	// Verify the first delegation via the canister-signature path.
	if err := verifyCanisterSignedDelegation(
		dc.Delegations[0],
		canisterSig,
		rootPublicKey,
		currentTimeNS,
	); err != nil {
		return principal.Principal{}, nil, fmt.Errorf("delegation[0]: %w", err)
	}

	// Walk remaining links: each is signed by the previous delegation's
	// pubkey using plain Ed25519.
	for i := 1; i < len(dc.Delegations); i++ {
		signerDER := []byte(dc.Delegations[i-1].Delegation.PublicKey)
		signerKey, err := certification.PublicED25519KeyFromDER(signerDER)
		if err != nil {
			return principal.Principal{}, nil, fmt.Errorf("delegation[%d] signer: %w", i, err)
		}
		if err := verifyEd25519SignedDelegation(
			dc.Delegations[i],
			*signerKey,
			currentTimeNS,
		); err != nil {
			return principal.Principal{}, nil, fmt.Errorf("delegation[%d]: %w", i, err)
		}
	}

	sessionPubKey := []byte(dc.Delegations[len(dc.Delegations)-1].Delegation.PublicKey)
	return principal.NewSelfAuthenticating([]byte(dc.PublicKey)), sessionPubKey, nil
}

func verifyCanisterSignedDelegation(
	sd ii.SignedDelegation,
	canisterSig *ii.CanisterSigPublicKey,
	rootPublicKey []byte,
	currentTimeNS uint64,
) error {
	if uint64(sd.Delegation.Expiration) < currentTimeNS {
		return fmt.Errorf("expired")
	}

	message, err := sd.Delegation.SignatureMessage()
	if err != nil {
		return err
	}

	var wrapper struct {
		Certificate []byte            `cbor:"certificate"`
		Tree        hashtree.HashTree `cbor:"tree"`
	}
	if err := cbor.Unmarshal([]byte(sd.Signature), &wrapper); err != nil {
		return fmt.Errorf("decode sig wrapper: %w", err)
	}

	var cert certification.Certificate
	if err := cbor.Unmarshal(wrapper.Certificate, &cert); err != nil {
		return fmt.Errorf("decode certificate: %w", err)
	}

	tree := wrapper.Tree.Digest()
	if err := certification.VerifyCertifiedData(
		cert,
		canisterSig.CanisterID,
		rootPublicKey,
		tree[:],
	); err != nil {
		return fmt.Errorf("verify certificate: %w", err)
	}

	seed := sha256.Sum256(canisterSig.Seed)
	msg := sha256.Sum256(message)
	if _, err := wrapper.Tree.Lookup(hashtree.Label("sig"), seed[:], msg[:]); err != nil {
		return fmt.Errorf("witness lookup: %w", err)
	}
	return nil
}

func verifyEd25519SignedDelegation(
	sd ii.SignedDelegation,
	signerKey ed25519.PublicKey,
	currentTimeNS uint64,
) error {
	if uint64(sd.Delegation.Expiration) < currentTimeNS {
		return fmt.Errorf("expired")
	}
	message, err := sd.Delegation.SignatureMessage()
	if err != nil {
		return err
	}
	if !ed25519.Verify(signerKey, message, []byte(sd.Signature)) {
		return fmt.Errorf("signature mismatch")
	}
	return nil
}

// VerifyChallengeSignature verifies that the leaf session key signed the
// given challenge. The session key is the DER-wrapped Ed25519 pubkey
// returned by VerifyDelegationChain.
func VerifyChallengeSignature(sessionPubKeyDER, challenge, sig []byte) error {
	key, err := certification.PublicED25519KeyFromDER(sessionPubKeyDER)
	if err != nil {
		return fmt.Errorf("parse session pubkey: %w", err)
	}
	if !ed25519.Verify(*key, challenge, sig) {
		return fmt.Errorf("challenge signature mismatch")
	}
	return nil
}
