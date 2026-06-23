package telemetry

import (
	"context"
	"log/slog"
)

// teeHandler fans a record out to multiple slog handlers (e.g. stderr for
// `podman logs` plus the OTel bridge for Grafana). Enabled if any child is.
type teeHandler struct {
	handlers []slog.Handler
}

func (h teeHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, c := range h.handlers {
		if c.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (h teeHandler) Handle(ctx context.Context, r slog.Record) error {
	for _, c := range h.handlers {
		if c.Enabled(ctx, r.Level) {
			if err := c.Handle(ctx, r.Clone()); err != nil {
				return err
			}
		}
	}
	return nil
}

func (h teeHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	next := make([]slog.Handler, len(h.handlers))
	for i, c := range h.handlers {
		next[i] = c.WithAttrs(attrs)
	}
	return teeHandler{handlers: next}
}

func (h teeHandler) WithGroup(name string) slog.Handler {
	next := make([]slog.Handler, len(h.handlers))
	for i, c := range h.handlers {
		next[i] = c.WithGroup(name)
	}
	return teeHandler{handlers: next}
}
