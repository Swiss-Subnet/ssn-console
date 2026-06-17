package sync

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/aviate-labs/agent-go/candid/idl"
	"github.com/aviate-labs/agent-go/principal"

	mpb "go.opentelemetry.io/proto/otlp/metrics/v1"

	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/canister"
)

func canisterID(b byte) principal.Principal {
	raw := make([]byte, 29)
	raw[0] = b
	return principal.Principal{Raw: raw}
}

func snapshot(id principal.Principal, ts, burned uint64) canister.CyclesMetricsSnapshot {
	return canister.CyclesMetricsSnapshot{
		TimestampNS:                    ts,
		CanisterID:                     id,
		Memory:                         idl.NewNat(uint64(0)),
		ComputeAllocation:              idl.NewNat(uint64(0)),
		IngressInduction:               idl.NewNat(uint64(0)),
		Instructions:                   idl.NewNat(uint64(0)),
		RequestAndResponseTransmission: idl.NewNat(uint64(0)),
		Uninstall:                      idl.NewNat(uint64(0)),
		HTTPOutcalls:                   idl.NewNat(uint64(0)),
		BurnedCycles:                   idl.NewNat(burned),
	}
}

// page is one ListMetricsAfter response: snapshots plus the cursor to return.
type page struct {
	snapshots []canister.CyclesMetricsSnapshot
	next      *canister.Cursor
}

type fakeCanister struct {
	pages    []page
	calls    []canister.Cursor // cursor seen on each ListMetricsAfter call
	recorded []canister.CanisterUsage
}

func (f *fakeCanister) ListMetricsAfter(_ context.Context, cursor *canister.Cursor) ([]canister.CyclesMetricsSnapshot, *canister.Cursor, error) {
	f.calls = append(f.calls, *cursor)
	p := f.pages[len(f.calls)-1]
	return p.snapshots, p.next, nil
}

func (f *fakeCanister) RecordUsage(_ context.Context, usages []canister.CanisterUsage) error {
	f.recorded = append(f.recorded, usages...)
	return nil
}

type fakePusher struct{ pushed int }

func (f *fakePusher) Push(_ context.Context, _ *mpb.ResourceMetrics) error {
	f.pushed++
	return nil
}

func cursorAt(ts uint64) *canister.Cursor {
	return &canister.Cursor{TimestampNS: ts, CanisterID: minPrincipal()}
}

func TestRunPagesAndDedupsLatestUsage(t *testing.T) {
	a, b := canisterID(1), canisterID(2)
	client := &fakeCanister{pages: []page{
		// page 1: a@100 (older), b@110
		{snapshots: []canister.CyclesMetricsSnapshot{snapshot(a, 100, 11), snapshot(b, 110, 21)}, next: cursorAt(110)},
		// page 2: a@200 (newer -> wins), then nil cursor ends the loop
		{snapshots: []canister.CyclesMetricsSnapshot{snapshot(a, 200, 99)}, next: nil},
	}}
	pusher := &fakePusher{}
	dir := t.TempDir()

	if err := Run(context.Background(), Deps{Client: client, Pusher: pusher, StateDir: dir, Now: time.Now}); err != nil {
		t.Fatalf("Run: %v", err)
	}

	if len(client.calls) != 2 {
		t.Fatalf("expected 2 pages walked, got %d", len(client.calls))
	}
	// page 2's cursor must be page 1's returned next_cursor.
	if client.calls[1].TimestampNS != 110 {
		t.Errorf("page 2 cursor ts = %d, want 110", client.calls[1].TimestampNS)
	}
	if pusher.pushed != 2 {
		t.Errorf("pushed %d times, want 2 (one per non-empty page)", pusher.pushed)
	}

	if len(client.recorded) != 2 {
		t.Fatalf("recorded %d usages, want 2 (latest per canister)", len(client.recorded))
	}
	byID := map[string]uint64{}
	for _, u := range client.recorded {
		byID[u.CanisterID.String()] = u.BurnedCycles
	}
	if byID[a.String()] != 99 {
		t.Errorf("canister a burned = %d, want 99 (a@200 wins over a@100)", byID[a.String()])
	}
	if byID[b.String()] != 21 {
		t.Errorf("canister b burned = %d, want 21", byID[b.String()])
	}
}

func TestRunRestoresAndPersistsTimestamp(t *testing.T) {
	dir := t.TempDir()
	tsFile := filepath.Join(dir, timestampFileName)
	if err := os.WriteFile(tsFile, []byte("500"), 0o644); err != nil {
		t.Fatal(err)
	}

	client := &fakeCanister{pages: []page{
		{snapshots: []canister.CyclesMetricsSnapshot{snapshot(canisterID(1), 600, 1)}, next: cursorAt(600)},
		{snapshots: nil, next: nil},
	}}
	if err := Run(context.Background(), Deps{Client: client, Pusher: &fakePusher{}, StateDir: dir, Now: time.Now}); err != nil {
		t.Fatalf("Run: %v", err)
	}

	// Restore: first cursor seeded from the persisted 500, not now()-1h.
	if client.calls[0].TimestampNS != 500 {
		t.Errorf("start cursor ts = %d, want 500 (restored)", client.calls[0].TimestampNS)
	}
	// Persist: last advanced cursor (600) written back.
	b, err := os.ReadFile(tsFile)
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := strconv.ParseUint(string(b), 10, 64); got != 600 {
		t.Errorf("persisted ts = %d, want 600", got)
	}
}

func TestRunDefaultsToOneHourAgoWhenNoFile(t *testing.T) {
	fixed := time.Unix(10_000, 0)
	client := &fakeCanister{pages: []page{{snapshots: nil, next: nil}}}
	if err := Run(context.Background(), Deps{
		Client: client, Pusher: &fakePusher{}, StateDir: t.TempDir(),
		Now: func() time.Time { return fixed },
	}); err != nil {
		t.Fatalf("Run: %v", err)
	}
	want := uint64(fixed.Add(-time.Hour).UnixNano())
	if client.calls[0].TimestampNS != want {
		t.Errorf("start cursor ts = %d, want %d (now-1h)", client.calls[0].TimestampNS, want)
	}
}
