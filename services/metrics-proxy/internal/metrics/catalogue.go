package metrics

// Metric is one entry in the fixed catalogue the proxy exposes to the
// frontend. Each entry maps a stable client-facing slug to the underlying
// Prometheus series name that the canister-otlp-syncer emits.
//
// The proxy never accepts raw PromQL from clients: callers pick a slug,
// the proxy builds the query with canister_id="..." as the only variable
// label. Extending the catalogue is the only way to expose a new metric.
type Metric struct {
	Slug        string // URL path component: /v0/metrics/canisters/{id}/metrics/{slug}
	Series      string // Prometheus metric name emitted by the syncer
	Unit        string
	Description string
}

var catalogue = map[string]Metric{
	"memory-bytes": {
		Slug:        "memory-bytes",
		Series:      "ic_canister_memory_bytes",
		Unit:        "bytes",
		Description: "Canister memory usage.",
	},
	"compute-time-seconds": {
		Slug:        "compute-time-seconds",
		Series:      "ic_canister_compute_time_seconds_total",
		Unit:        "seconds",
		Description: "Cumulative compute time billed to the canister.",
	},
	"burned-cycles": {
		Slug:        "burned-cycles",
		Series:      "ic_canister_burned_cycles_total",
		Unit:        "cycles",
		Description: "Cumulative cycles burned by the canister.",
	},
}

func Lookup(slug string) (Metric, bool) {
	m, ok := catalogue[slug]
	return m, ok
}

func All() []Metric {
	out := make([]Metric, 0, len(catalogue))
	for _, m := range catalogue {
		out = append(out, m)
	}
	return out
}
