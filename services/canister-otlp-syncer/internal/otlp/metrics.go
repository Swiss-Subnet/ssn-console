package otlp

import (
	"math/big"

	backendgen "github.com/swiss-subnet/ssn-console/services/canister-clients/backend"
	cmgen "github.com/swiss-subnet/ssn-console/services/canister-clients/cyclesmonitor"

	cpb "go.opentelemetry.io/proto/otlp/common/v1"
	mpb "go.opentelemetry.io/proto/otlp/metrics/v1"
	rpb "go.opentelemetry.io/proto/otlp/resource/v1"
)

// Cycle-cost constants from https://docs.internetcomputer.org/references/cycles-costs
var (
	cyclesPerGBPerSecond          = big.NewInt(127_000)
	cyclesPerPercentComputePerSec = big.NewInt(10_000_000)
	cyclesPerIngressByte          = big.NewInt(2_000)
	cyclesPerTransmissionByte     = big.NewInt(1_000)
	cyclesPerSecondOfCompute      = big.NewInt(2_000_000_000)
	cyclesPerUninstall            = big.NewInt(5_000_000)
	bytesPerGB                    = big.NewInt(1_024 * 1_024 * 1_024)
)

// Usage is the latest derived per-canister usage, matching the backend's
// CanisterUsage shape (all nat64). Returned so the caller can record_usage.
type Usage = backendgen.CanisterUsage

type metricDef struct {
	name        string
	description string
	unit        string
	// value extracts the int value of this metric from a snapshot.
	value func(s cmgen.CyclesMetricsSnapshotDto) *big.Int
	// set writes the derived value into the Usage being accumulated.
	set func(u *Usage, v uint64)
}

func div(a, b *big.Int) *big.Int { return new(big.Int).Div(a, b) }
func mul(a, b *big.Int) *big.Int { return new(big.Int).Mul(a, b) }

// defs lists every emitted metric in order: each "base" cycles total followed
// by its optional derived metric, mirroring the former TS implementation.
var defs = []metricDef{
	{
		name: "ic_canister_memory_cycles_total", description: "Cumulative cycles burned for memory", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.Memory.BigInt() },
		set:   func(u *Usage, v uint64) { u.Memory = v },
	},
	{
		name: "ic_canister_memory_bytes", description: "Canister memory in bytes", unit: "byte-seconds",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int {
			return div(mul(s.Memory.BigInt(), bytesPerGB), cyclesPerGBPerSecond)
		},
		set: func(u *Usage, v uint64) { u.MemoryBytes = v },
	},
	{
		name: "ic_canister_compute_allocation_cycles_total", description: "Cumulative cycles burned for compute allocation", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.ComputeAllocation.BigInt() },
		set:   func(u *Usage, v uint64) { u.ComputeAllocation = v },
	},
	{
		name: "ic_canister_compute_allocation_percent", description: "Canister compute allocation percentage", unit: "percent-seconds",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int {
			return div(s.ComputeAllocation.BigInt(), cyclesPerPercentComputePerSec)
		},
		set: func(u *Usage, v uint64) { u.ComputeAllocationPercent = v },
	},
	{
		name: "ic_canister_ingress_induction_cycles_total", description: "Cumulative cycles burned for ingress induction", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.IngressInduction.BigInt() },
		set:   func(u *Usage, v uint64) { u.IngressInduction = v },
	},
	{
		name: "ic_canister_ingress_induction_bytes_total", description: "Total bytes of ingress induction including the base price represented as bytes", unit: "bytes",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int {
			return div(s.IngressInduction.BigInt(), cyclesPerIngressByte)
		},
		set: func(u *Usage, v uint64) { u.IngressInductionBytesTotal = v },
	},
	{
		name: "ic_canister_instructions_cycles_total", description: "Cumulative cycles burned for instructions", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.Instructions.BigInt() },
		set:   func(u *Usage, v uint64) { u.Instructions = v },
	},
	{
		name: "ic_canister_compute_time_seconds_total", description: "Total compute time in seconds (2b instructions = 1s)", unit: "seconds",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int {
			return div(s.Instructions.BigInt(), cyclesPerSecondOfCompute)
		},
		set: func(u *Usage, v uint64) { u.ComputeTimeSecondsTotal = v },
	},
	{
		name: "ic_canister_request_response_transmission_cycles_total", description: "Cumulative cycles burned for request and response transmission", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.RequestAndResponseTransmission.BigInt() },
		set:   func(u *Usage, v uint64) { u.RequestAndResponseTransmission = v },
	},
	{
		name: "ic_canister_transmission_bytes_total", description: "Total bytes of request and response transmission including the base price represented as bytes", unit: "bytes",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int {
			return div(s.RequestAndResponseTransmission.BigInt(), cyclesPerTransmissionByte)
		},
		set: func(u *Usage, v uint64) { u.TransmissionBytesTotal = v },
	},
	{
		name: "ic_canister_uninstall_cycles_total", description: "Cumulative cycles burned for uninstall", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.Uninstall.BigInt() },
		set:   func(u *Usage, v uint64) { u.Uninstall = v },
	},
	{
		name: "ic_canister_uninstalls_total", description: "Total uninstalls", unit: "count",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return div(s.Uninstall.BigInt(), cyclesPerUninstall) },
		set:   func(u *Usage, v uint64) { u.UninstallsTotal = v },
	},
	{
		name: "ic_canister_http_outcalls_cycles_total", description: "Cumulative cycles burned for HTTP outcalls", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.HttpOutcalls.BigInt() },
		set:   func(u *Usage, v uint64) { u.HttpOutcalls = v },
	},
	{
		name: "ic_canister_burned_cycles_total", description: "Total cumulative burned cycles", unit: "cycles",
		value: func(s cmgen.CyclesMetricsSnapshotDto) *big.Int { return s.BurnedCycles.BigInt() },
		set:   func(u *Usage, v uint64) { u.BurnedCycles = v },
	},
}

// Build converts a page of snapshots into an OTLP metrics request and the
// derived per-canister usages (one per snapshot).
func Build(snapshots []cmgen.CyclesMetricsSnapshotDto, environment string) (*mpb.ResourceMetrics, []Usage) {
	dataPoints := make([][]*mpb.NumberDataPoint, len(defs))

	usages := make([]Usage, 0, len(snapshots))
	for _, s := range snapshots {
		u := Usage{CanisterId: s.CanisterId}
		attrs := []*cpb.KeyValue{{
			Key:   "canister_id",
			Value: &cpb.AnyValue{Value: &cpb.AnyValue_StringValue{StringValue: s.CanisterId.String()}},
		}}
		for i, d := range defs {
			v := d.value(s)
			d.set(&u, v.Uint64())
			dataPoints[i] = append(dataPoints[i], &mpb.NumberDataPoint{
				StartTimeUnixNano: 0,
				TimeUnixNano:      s.TimestampNs,
				Attributes:        attrs,
				Value:             &mpb.NumberDataPoint_AsInt{AsInt: bigToInt64(v)},
			})
		}
		usages = append(usages, u)
	}

	metrics := make([]*mpb.Metric, 0, len(defs))
	for i, d := range defs {
		metrics = append(metrics, &mpb.Metric{
			Name:        d.name,
			Description: d.description,
			Unit:        d.unit,
			Data: &mpb.Metric_Sum{Sum: &mpb.Sum{
				AggregationTemporality: mpb.AggregationTemporality_AGGREGATION_TEMPORALITY_CUMULATIVE,
				IsMonotonic:            true,
				DataPoints:             dataPoints[i],
			}},
		})
	}

	res := &mpb.ResourceMetrics{
		Resource: &rpb.Resource{Attributes: []*cpb.KeyValue{
			strAttr("service.namespace", "ssn"),
			strAttr("service.name", "canister-otlp-syncer"),
			strAttr("deployment.environment", environment),
		}},
		ScopeMetrics: []*mpb.ScopeMetrics{{
			Scope:   &cpb.InstrumentationScope{Name: "canister-otlp-syncer"},
			Metrics: metrics,
		}},
	}
	return res, usages
}

func strAttr(k, v string) *cpb.KeyValue {
	return &cpb.KeyValue{Key: k, Value: &cpb.AnyValue{Value: &cpb.AnyValue_StringValue{StringValue: v}}}
}

// bigToInt64 saturates to int64; cycle totals fit comfortably but guard anyway.
func bigToInt64(b *big.Int) int64 {
	if !b.IsInt64() {
		return 1<<63 - 1
	}
	return b.Int64()
}
