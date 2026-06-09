package grafana

import (
	"context"
	"math"
	"strings"
	"time"
)

// Fake is a deterministic in-memory Querier used when GRAFANA_URL is unset
// or USE_FAKE_METRICS=true. The shape varies per metric name so each
// series in the frontend is visually distinct.
//
// The wall-clock unix timestamp drives every wave, so zooming the time
// range in the UI doesn't change *which* curve you see, only how much of
// it. Periods are long (multiple hours) so a 1h view shows a slice that
// reads as drift + noise, not a mechanical sine.
type Fake struct {
	Now func() time.Time
}

func NewFake() *Fake {
	return &Fake{Now: time.Now}
}

func (f *Fake) QueryRange(_ context.Context, req QueryRangeRequest) ([]Point, error) {
	step := req.Step
	if step <= 0 {
		step = time.Minute
	}
	if req.End.Before(req.Start) {
		return nil, nil
	}

	gen := pickGenerator(req.Query)
	seed := hash(req.Query)

	var points []Point
	for t := req.Start; !t.After(req.End); t = t.Add(step) {
		points = append(points, Point{TS: t.UnixMilli(), Value: gen(t, seed)})
	}
	return points, nil
}

type generator func(t time.Time, seed uint32) float64

func pickGenerator(query string) generator {
	switch {
	case strings.Contains(query, "memory_bytes"):
		return memoryShape
	case strings.Contains(query, "burned_cycles"):
		return burnedCyclesShape
	case strings.Contains(query, "compute_time_seconds"):
		return computeTimeShape
	default:
		return defaultShape
	}
}

// hoursSince returns wall-clock hours since the unix epoch, offset by a
// seed so different series don't move in lockstep.
func hoursSince(t time.Time, seed uint32) float64 {
	return float64(t.Unix())/3600.0 + float64(seed%1000)/97.0
}

// pseudoNoise is deterministic, non-periodic-looking noise in [-1, 1].
// It's the sum of three irrational-frequency sines so the period is huge
// in practice; the human eye reads it as noise, not a wave.
func pseudoNoise(x float64) float64 {
	return (math.Sin(x*7.13) + math.Sin(x*17.7+1.3) + math.Sin(x*3.11+4.2)) / 3.0
}

// memoryShape: 50-300 MB band, slow drift up, occasional sharp drops
// (GC / heap free). At 1h zoom the dominant feature is noise + a slope,
// not a sine wave.
func memoryShape(t time.Time, seed uint32) float64 {
	x := hoursSince(t, seed)
	base := 50e6 + float64(seed%200)*1e6
	// Slow saw with a ~17h period: only ~6% of the cycle visible in 1h.
	period := 17.0 + float64(seed%7)
	phase := math.Mod(math.Mod(x, period)+period, period) / period
	saw := math.Pow(phase, 1.6) * 90e6
	// Noise dominates at short ranges; ~6 MB amplitude.
	noise := pseudoNoise(x*3.7+float64(seed%23)) * 6e6
	return base + saw + noise
}

// burnedCyclesShape: monotonic counter. Slope wobbles with bursts so the
// rate isn't constant, but the value is always increasing -- the chart
// reads as a counter, not a wave.
func burnedCyclesShape(t time.Time, seed uint32) float64 {
	x := hoursSince(t, seed)
	baseRate := 2e9 + float64(seed%100)*1e8
	burstEnvelope := math.Max(0, math.Sin(x/9+float64(seed%9))) - 0.55
	if burstEnvelope < 0 {
		burstEnvelope = 0
	}
	burstRate := burstEnvelope * 4e9
	// Approximate integral against epoch so the value grows with x.
	return (baseRate + burstRate*0.4) * x
}

// computeTimeShape: monotonic counter with a slow diurnal slope variation
// (24h period). At 1h zoom you see almost-linear growth.
func computeTimeShape(t time.Time, seed uint32) float64 {
	x := hoursSince(t, seed)
	baseRate := 30.0 + float64(seed%20)
	hour := float64(t.UTC().Hour()) + float64(t.UTC().Minute())/60
	diurnal := 1 + 0.3*math.Sin((hour-8)/24*2*math.Pi)
	return baseRate * diurnal * x
}

// defaultShape: noisy drift, no obvious wave. Used for metrics without a
// tuned curve.
func defaultShape(t time.Time, seed uint32) float64 {
	x := hoursSince(t, seed)
	return float64(seed%1000)*10 + x*0.5 + pseudoNoise(x*5.2+float64(seed%19))*40
}

func hash(s string) uint32 {
	var h uint32 = 2166136261
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}
