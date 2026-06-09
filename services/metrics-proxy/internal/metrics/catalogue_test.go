package metrics

import "testing"

func TestLookup(t *testing.T) {
	if _, ok := Lookup("memory-bytes"); !ok {
		t.Fatal("memory-bytes should be in catalogue")
	}
	if _, ok := Lookup("does-not-exist"); ok {
		t.Fatal("unknown slug should not resolve")
	}
}

func TestAllSlugsUnique(t *testing.T) {
	seen := map[string]bool{}
	for _, m := range All() {
		if seen[m.Slug] {
			t.Fatalf("duplicate slug: %s", m.Slug)
		}
		seen[m.Slug] = true
	}
}
