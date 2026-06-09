package iiauth

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"

	"github.com/aviate-labs/agent-go/certification/ii"
	"github.com/aviate-labs/agent-go/principal"
)

// derWrapEd25519 builds the SubjectPublicKeyInfo DER encoding that
// agent-go's PublicED25519KeyFromDER expects. The fixed prefix is the
// SPKI header for Ed25519 (id-Ed25519 = 1.3.101.112).
var derEd25519Prefix = []byte{
	0x30, 0x2a,
	0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
	0x03, 0x21, 0x00,
}

func derWrapEd25519(pub ed25519.PublicKey) []byte {
	out := make([]byte, 0, len(derEd25519Prefix)+ed25519.PublicKeySize)
	out = append(out, derEd25519Prefix...)
	out = append(out, pub...)
	return out
}

func TestVerifyDelegationChain_EmptyChainReturnsSelfAuthPrincipal(t *testing.T) {
	pub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der := derWrapEd25519(pub)
	dc := ii.DelegationChain{PublicKey: ii.HexString(der)}

	got, sessionPubKey, err := VerifyDelegationChain(
		dc,
		0,
		principal.Principal{},
		nil,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := principal.NewSelfAuthenticating(der)
	if got.String() != want.String() {
		t.Fatalf("principal mismatch:\n got %s\nwant %s", got, want)
	}
	if string(sessionPubKey) != string(der) {
		t.Fatal("session pubkey should equal the chain root pubkey for empty chains")
	}
}

func TestVerifyChallengeSignature_HappyPath(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der := derWrapEd25519(pub)
	challenge := []byte("hello world")
	sig := ed25519.Sign(priv, challenge)

	if err := VerifyChallengeSignature(der, challenge, sig); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestVerifyChallengeSignature_RejectsWrongSignature(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	der := derWrapEd25519(pub)
	good := ed25519.Sign(priv, []byte("hello"))

	if err := VerifyChallengeSignature(der, []byte("world"), good); err == nil {
		t.Fatal("expected signature mismatch for different challenge")
	}
}

func TestChallengeBytes_BindsChainPublicKey(t *testing.T) {
	chainPub := []byte{0xde, 0xad, 0xbe, 0xef}
	got := ChallengeBytes("GET", "/v1/foo", "a=1&b=2", 1700000000000, chainPub)
	// The chain pubkey hash must appear in the challenge; a different
	// chain pubkey must produce a different challenge.
	other := ChallengeBytes("GET", "/v1/foo", "a=1&b=2", 1700000000000, []byte{0x00})
	if string(got) == string(other) {
		t.Fatal("challenge must differ when chain pubkey differs")
	}
}

// canisterSigDER builds a DER-encoded canister-signature pubkey whose
// CanisterID matches `canister`. The seed is arbitrary; CanisterSigPublicKey
// is just a CBOR wrapper around (canister_id, seed).
func canisterSigDER(canister principal.Principal, seed []byte) []byte {
	csk := &ii.CanisterSigPublicKey{CanisterID: canister, Seed: seed}
	return csk.DER()
}

func TestVerifyDelegationChain_RejectsUnparseableRootPubKey(t *testing.T) {
	dc := ii.DelegationChain{
		Delegations: []ii.SignedDelegation{{}},
		PublicKey:   ii.HexString("not-a-real-der"),
	}
	_, _, err := VerifyDelegationChain(dc, 0, principal.Principal{Raw: []byte{1, 2, 3}}, []byte{0x00})
	if err == nil || !contains(err.Error(), "parse root pubkey") {
		t.Fatalf("want parse-root-pubkey error, got %v", err)
	}
}

func TestVerifyDelegationChain_RejectsWrongIICanisterAnchor(t *testing.T) {
	expectedCanister := principal.Principal{Raw: []byte{1, 2, 3}}
	actualCanister := principal.Principal{Raw: []byte{9, 9, 9}}
	der := canisterSigDER(actualCanister, []byte{0xaa})
	dc := ii.DelegationChain{
		Delegations: []ii.SignedDelegation{{}},
		PublicKey:   ii.HexString(der),
	}
	_, _, err := VerifyDelegationChain(dc, 0, expectedCanister, []byte{0x00})
	if err == nil || !contains(err.Error(), "not anchored") {
		t.Fatalf("want anchor-mismatch error, got %v", err)
	}
}

func TestVerifyDelegationChain_RejectsExpiredFirstLink(t *testing.T) {
	canister := principal.Principal{Raw: []byte{1, 2, 3}}
	der := canisterSigDER(canister, []byte{0xaa})
	expiredAtNS := uint64(1_000_000_000)
	now := uint64(2_000_000_000)
	dc := ii.DelegationChain{
		Delegations: []ii.SignedDelegation{{
			Delegation: ii.Delegation{Expiration: ii.BEHexUint64(expiredAtNS)},
		}},
		PublicKey: ii.HexString(der),
	}
	_, _, err := VerifyDelegationChain(dc, now, canister, []byte{0x00})
	if err == nil || !contains(err.Error(), "expired") {
		t.Fatalf("want expired error, got %v", err)
	}
}

func TestVerifyDelegationChain_RejectsMalformedSignatureWrapper(t *testing.T) {
	canister := principal.Principal{Raw: []byte{1, 2, 3}}
	der := canisterSigDER(canister, []byte{0xaa})
	// Future expiration so we reach the CBOR-decode step.
	dc := ii.DelegationChain{
		Delegations: []ii.SignedDelegation{{
			Delegation: ii.Delegation{Expiration: ii.BEHexUint64(uint64(1) << 62)},
			Signature:  ii.HexString([]byte{0xff, 0xff, 0xff}),
		}},
		PublicKey: ii.HexString(der),
	}
	_, _, err := VerifyDelegationChain(dc, 0, canister, []byte{0x00})
	if err == nil || !contains(err.Error(), "decode sig wrapper") {
		t.Fatalf("want decode-sig-wrapper error, got %v", err)
	}
}

func TestVerifyEd25519SignedDelegation_RejectsExpired(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	sd := ii.SignedDelegation{
		Delegation: ii.Delegation{Expiration: ii.BEHexUint64(1)},
	}
	if err := verifyEd25519SignedDelegation(sd, pub, 2); err == nil ||
		!contains(err.Error(), "expired") {
		t.Fatalf("want expired error, got %v", err)
	}
}

func TestVerifyEd25519SignedDelegation_RejectsSignatureMismatch(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	sd := ii.SignedDelegation{
		Delegation: ii.Delegation{Expiration: ii.BEHexUint64(uint64(1) << 62)},
		Signature:  ii.HexString(make([]byte, ed25519.SignatureSize)),
	}
	if err := verifyEd25519SignedDelegation(sd, pub, 0); err == nil ||
		!contains(err.Error(), "signature mismatch") {
		t.Fatalf("want signature-mismatch error, got %v", err)
	}
}

func TestVerifyEd25519SignedDelegation_AcceptsValidSignature(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	delegation := ii.Delegation{
		PublicKey:  ii.HexString([]byte{0x01, 0x02, 0x03}),
		Expiration: ii.BEHexUint64(uint64(1) << 62),
	}
	msg, err := delegation.SignatureMessage()
	if err != nil {
		t.Fatal(err)
	}
	sig := ed25519.Sign(priv, msg)
	sd := ii.SignedDelegation{Delegation: delegation, Signature: ii.HexString(sig)}
	if err := verifyEd25519SignedDelegation(sd, pub, 0); err != nil {
		t.Fatalf("happy path must accept a valid signature: %v", err)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
