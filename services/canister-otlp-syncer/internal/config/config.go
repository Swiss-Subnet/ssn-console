package config

import (
	"fmt"
	"os"
)

type Config struct {
	BackendCanisterID       string
	CyclesMonitorCanisterID string
	HTTPGateway             string
	PrivateKeyPEM           string
	MetricsEndpoint         string
	GrafanaEnvironment      string
}

func Load() (*Config, error) {
	backend, err := required("CANISTER_ID_BACKEND")
	if err != nil {
		return nil, err
	}
	cyclesMonitor, err := required("CANISTER_ID_CYCLES_MONITOR")
	if err != nil {
		return nil, err
	}
	gateway, err := required("HTTP_GATEWAY")
	if err != nil {
		return nil, err
	}
	privateKey, err := required("PRIVATE_KEY")
	if err != nil {
		return nil, err
	}
	otlpEndpoint, err := required("OTEL_EXPORTER_OTLP_ENDPOINT")
	if err != nil {
		return nil, err
	}

	return &Config{
		BackendCanisterID:       backend,
		CyclesMonitorCanisterID: cyclesMonitor,
		HTTPGateway:             gateway,
		PrivateKeyPEM:           privateKey,
		MetricsEndpoint:         otlpEndpoint + "/v1/metrics",
		GrafanaEnvironment:      os.Getenv("GRAFANA_ENVIRONMENT"),
	}, nil
}

func required(name string) (string, error) {
	v := os.Getenv(name)
	if v == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return v, nil
}
