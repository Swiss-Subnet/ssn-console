package sync

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aviate-labs/agent-go/principal"

	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/canister"
	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/otlp"
)

const timestampFileName = ".last-cycles-monitor-timestamp"

type Deps struct {
	Client      *canister.Client
	Pusher      *otlp.Pusher
	Environment string
	StateDir    string
	Now         func() time.Time
}

func Run(ctx context.Context, d Deps) error {
	now := d.Now
	if now == nil {
		now = time.Now
	}
	timestampFile := filepath.Join(d.StateDir, timestampFileName)

	start := readStartTimestamp(timestampFile, now)
	// Cursor is exclusive; min principal pages from the start of that timestamp.
	cursor := &canister.Cursor{TimestampNS: start, CanisterID: minPrincipal()}

	type stamped struct {
		usage otlp.Usage
		ts    uint64
	}
	latest := map[string]stamped{}
	total := 0

	for {
		snapshots, next, err := d.Client.ListMetricsAfter(ctx, cursor)
		if err != nil {
			return err
		}
		if len(snapshots) > 0 {
			rm, usages := otlp.Build(snapshots, d.Environment)
			if err := d.Pusher.Push(ctx, rm); err != nil {
				return err
			}
			total += len(snapshots)
			for i, u := range usages {
				key := u.CanisterID.String()
				ts := snapshots[i].TimestampNS
				if cur, ok := latest[key]; !ok || ts >= cur.ts {
					latest[key] = stamped{usage: u, ts: ts}
				}
			}
		}
		if next == nil {
			break
		}
		cursor = next
		writeTimestamp(timestampFile, next.TimestampNS)
	}

	if total == 0 {
		log.Println("no new metrics to push")
	} else {
		log.Printf("pushed %d metrics to alloy", total)
	}

	usages := make([]otlp.Usage, 0, len(latest))
	for _, s := range latest {
		usages = append(usages, s.usage)
	}
	if len(usages) == 0 {
		return nil
	}
	log.Printf("recording %d canister usages to backend", len(usages))
	return d.Client.RecordUsage(ctx, usages)
}

func readStartTimestamp(path string, now func() time.Time) uint64 {
	b, err := os.ReadFile(path)
	if err == nil {
		if v, perr := strconv.ParseUint(strings.TrimSpace(string(b)), 10, 64); perr == nil {
			return v
		}
	}
	return uint64(now().Add(-time.Hour).UnixNano())
}

func writeTimestamp(path string, ns uint64) {
	if err := os.WriteFile(path, []byte(strconv.FormatUint(ns, 10)), 0o644); err != nil {
		log.Printf("warning: persist cursor timestamp: %v", err)
	}
}

func minPrincipal() principal.Principal {
	return principal.Principal{Raw: make([]byte, 29)}
}
