package backend

import (
	"encoding/hex"
	"strings"
	"testing"
)

func TestLoadIdentity_LocalReplicaUsesRFC8032Vector(t *testing.T) {
	id, err := LoadIdentity("", "http://127.0.0.1:4943")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// RFC 8032 Test 1 public key, hex.
	wantPubHex := "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
	got := id.PublicKey()
	// id.PublicKey() returns DER-wrapped; the raw key is the last 32 bytes.
	if len(got) < 32 {
		t.Fatalf("public key too short: %d bytes", len(got))
	}
	gotRawHex := hex.EncodeToString(got[len(got)-32:])
	if gotRawHex != wantPubHex {
		t.Fatalf("public key mismatch:\n got %s\nwant %s", gotRawHex, wantPubHex)
	}
}

func TestLoadIdentity_RejectsMissingPEMOnNonLocalHost(t *testing.T) {
	_, err := LoadIdentity("", "https://icp0.io")
	if err == nil {
		t.Fatal("expected error when pem path is empty and host is not local")
	}
	if !strings.Contains(err.Error(), "PROXY_IDENTITY_PEM is required") {
		t.Fatalf("expected production-mode error, got: %v", err)
	}
}

func TestIsLocalReplica(t *testing.T) {
	for _, c := range []struct {
		host string
		want bool
	}{
		{"http://127.0.0.1:4943", true},
		{"http://localhost:4943", true},
		{"http://0.0.0.0:4943", true},
		// Container host aliases for the host-side replica (compose dev).
		{"http://host.containers.internal:8000", true},
		{"http://host.docker.internal:8000", true},
		{"https://icp0.io", false},
		{"https://ic0.app", false},
	} {
		if got := isLocalReplica(c.host); got != c.want {
			t.Errorf("isLocalReplica(%q) = %v, want %v", c.host, got, c.want)
		}
	}
}
