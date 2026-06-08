package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port                int
	PayrexxBaseURL      string
	PayrexxInstanceName string
	PayrexxAPISecret    string

	GrafanaEnvironment string
}

func Load() (*Config, error) {
	instance, err := required("PAYREXX_INSTANCE_NAME")
	if err != nil {
		return nil, err
	}
	secret, err := required("PAYREXX_API_SECRET")
	if err != nil {
		return nil, err
	}
	port, err := optionalPort("PORT", 3001)
	if err != nil {
		return nil, err
	}

	return &Config{
		Port:                port,
		PayrexxBaseURL:      optional("PAYREXX_BASE_URL", "https://api.payrexx.com/v1.0"),
		PayrexxInstanceName: instance,
		PayrexxAPISecret:    secret,
		GrafanaEnvironment:  os.Getenv("GRAFANA_ENVIRONMENT"),
	}, nil
}

func required(name string) (string, error) {
	v := os.Getenv(name)
	if v == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return v, nil
}

func optional(name, def string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return def
}

func optionalPort(name string, def int) (int, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return def, nil
	}
	p, err := strconv.Atoi(raw)
	if err != nil || p < 1 || p > 65535 {
		return 0, fmt.Errorf("invalid %s: must be a valid port number between 1 and 65535", name)
	}
	return p, nil
}
