package telemetry

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type Config struct {
	ServiceName        string
	ServiceNamespace   string
	GrafanaEnvironment string
}

// Setup configures the global tracer and logger providers and returns a
// shutdown func that tears both down. Exporters read their endpoint from
// OTEL_EXPORTER_OTLP_ENDPOINT; when unset it defaults to localhost:4318 and the
// batchers log retry errors if nothing is listening. The Quadlet sets the
// endpoint explicitly to the host's Alloy instance, so this matters only for
// local runs.
func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	attrs := []attribute.KeyValue{
		semconv.ServiceName(cfg.ServiceName),
		semconv.ServiceNamespace(cfg.ServiceNamespace),
	}
	if cfg.GrafanaEnvironment != "" {
		attrs = append(attrs, semconv.DeploymentEnvironment(cfg.GrafanaEnvironment))
	}

	res, err := resource.New(ctx, resource.WithAttributes(attrs...))
	if err != nil {
		return nil, fmt.Errorf("resource: %w", err)
	}

	traceExporter, err := otlptrace.New(ctx, otlptracehttp.NewClient())
	if err != nil {
		return nil, fmt.Errorf("otlp trace exporter: %w", err)
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	logExporter, err := otlploghttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("otlp log exporter: %w", err)
	}
	lp := log.NewLoggerProvider(
		log.WithProcessor(log.NewBatchProcessor(logExporter)),
		log.WithResource(res),
	)
	global.SetLoggerProvider(lp)

	// Tee logs to stderr (for `podman logs`) and OTLP (for Grafana). The OTel
	// bridge attaches the active span context, so logged-in-request lines are
	// trace-correlated.
	slog.SetDefault(slog.New(teeHandler{handlers: []slog.Handler{
		slog.NewTextHandler(os.Stderr, nil),
		otelslog.NewHandler(cfg.ServiceName, otelslog.WithLoggerProvider(lp)),
	}}))

	shutdown := func(ctx context.Context) error {
		return errors.Join(tp.Shutdown(ctx), lp.Shutdown(ctx))
	}
	return shutdown, nil
}
