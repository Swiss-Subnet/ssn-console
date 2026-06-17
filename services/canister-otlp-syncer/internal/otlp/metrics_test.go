package otlp

import (
	"math/big"
	"testing"

	"github.com/aviate-labs/agent-go/candid/idl"
	"github.com/aviate-labs/agent-go/principal"

	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/canister"
)

func nat(v int64) idl.Nat { return idl.NewBigNat(big.NewInt(v)) }

func TestBuildDerivedValues(t *testing.T) {
	s := canister.CyclesMetricsSnapshot{
		TimestampNS:                    42,
		CanisterID:                     principal.Principal{Raw: make([]byte, 29)},
		Memory:                         nat(127_000),       // -> 1 GB = bytesPerGB byte-seconds
		ComputeAllocation:              nat(10_000_000),    // -> 1 percent-second
		IngressInduction:               nat(2_000),         // -> 1 byte
		Instructions:                   nat(2_000_000_000), // -> 1 second
		RequestAndResponseTransmission: nat(1_000),         // -> 1 byte
		Uninstall:                      nat(5_000_000),     // -> 1 uninstall
		HTTPOutcalls:                   nat(7),
		BurnedCycles:                   nat(99),
	}

	_, usages := Build([]canister.CyclesMetricsSnapshot{s}, "test")
	if len(usages) != 1 {
		t.Fatalf("want 1 usage, got %d", len(usages))
	}
	u := usages[0]

	cases := map[string]struct{ got, want uint64 }{
		"memory_cycles":      {u.Memory, 127_000},
		"memory_bytes":       {u.MemoryBytes, 1_024 * 1_024 * 1_024},
		"compute_percent":    {u.ComputeAllocationPercent, 1},
		"ingress_bytes":      {u.IngressInductionBytesTotal, 1},
		"compute_seconds":    {u.ComputeTimeSecondsTotal, 1},
		"transmission_bytes": {u.TransmissionBytesTotal, 1},
		"uninstalls_total":   {u.UninstallsTotal, 1},
		"http_outcalls":      {u.HTTPOutcalls, 7},
		"burned_cycles":      {u.BurnedCycles, 99},
	}
	for name, c := range cases {
		if c.got != c.want {
			t.Errorf("%s: got %d, want %d", name, c.got, c.want)
		}
	}
}

func TestBuildEmitsAllMetrics(t *testing.T) {
	s := canister.CyclesMetricsSnapshot{
		CanisterID:                     principal.Principal{Raw: make([]byte, 29)},
		Memory:                         nat(0),
		ComputeAllocation:              nat(0),
		IngressInduction:               nat(0),
		Instructions:                   nat(0),
		RequestAndResponseTransmission: nat(0),
		Uninstall:                      nat(0),
		HTTPOutcalls:                   nat(0),
		BurnedCycles:                   nat(0),
	}
	rm, _ := Build([]canister.CyclesMetricsSnapshot{s}, "test")
	got := len(rm.ScopeMetrics[0].Metrics)
	if got != len(defs) {
		t.Fatalf("want %d metrics, got %d", len(defs), got)
	}
}
