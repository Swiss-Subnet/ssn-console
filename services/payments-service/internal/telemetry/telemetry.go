package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type Config struct {
	ServiceName        string
	ServiceNamespace   string
	GrafanaEnvironment string
}

// Setup configures the global tracer provider and returns a shutdown func.
// OTLP exporter reads OTEL_EXPORTER_OTLP_ENDPOINT; if unset it defaults to
// localhost:4318 and the batcher logs retry errors when nothing is
// listening. The Quadlet sets the endpoint to the host's Alloy instance,
// so this matters only for local runs.
func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	exporter, err := otlptrace.New(ctx, otlptracehttp.NewClient())
	if err != nil {
		return nil, fmt.Errorf("otlp exporter: %w", err)
	}

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

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	return tp.Shutdown, nil
}
