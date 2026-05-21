// Package config loads the service's runtime configuration from process
// environment variables.
//
// Required:
//
//	PAYREXX_INSTANCE_NAME   merchant instance name
//	PAYREXX_API_SECRET      API secret for that instance
//
// Optional:
//
//	PORT                    listen port (default 3001)
//	PAYREXX_BASE_URL        Payrexx API base (default https://api.payrexx.com/v1.0)
//
// Locally, source `.env.local` via `just services::run payments-service`.
// In production these are injected by the systemd quadlet. Never commit
// `.env`-style files containing the API secret.
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
}

func Load() (*Config, error) {
	port, err := parsePort(getOptional("PORT", "3001"))
	if err != nil {
		return nil, err
	}
	instance, err := getRequired("PAYREXX_INSTANCE_NAME")
	if err != nil {
		return nil, err
	}
	secret, err := getRequired("PAYREXX_API_SECRET")
	if err != nil {
		return nil, err
	}
	return &Config{
		Port:                port,
		PayrexxBaseURL:      getOptional("PAYREXX_BASE_URL", "https://api.payrexx.com/v1.0"),
		PayrexxInstanceName: instance,
		PayrexxAPISecret:    secret,
	}, nil
}

func getRequired(name string) (string, error) {
	v := os.Getenv(name)
	if v == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return v, nil
}

func getOptional(name, def string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return def
}

func parsePort(s string) (int, error) {
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || n > 65535 {
		return 0, fmt.Errorf("invalid PORT: must be 1..65535, got %q", s)
	}
	return n, nil
}
