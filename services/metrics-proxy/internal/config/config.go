package config

import (
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port int

	// FrontendURL is the single allowed CORS origin.
	FrontendURL string

	// Grafana Cloud Prometheus-compatible read endpoint, e.g.
	//   https://prometheus-prod-XX-prod-XX.grafana.net/api/prom
	// Empty in dev: the fake in-memory data source is used instead.
	GrafanaURL      string
	GrafanaUsername string
	GrafanaPassword string

	// UseFakeMetrics forces the fake data source even when GRAFANA_URL is
	// set. Useful for tests and demos.
	UseFakeMetrics bool

	// ICHost is the replica URL the agent connects to: https://icp0.io
	// for mainnet, http://127.0.0.1:4943 for local dfx.
	ICHost string

	// IICanisterIDText is the Internet Identity canister principal text.
	// Mainnet default is wired in if unset.
	IICanisterIDText string

	// BackendCanisterIDText is the canister exposing
	// admin_list_user_readable_canister_principals.
	BackendCanisterIDText string

	// ProxyIdentityPEMPath optionally points at a PEM-encoded Ed25519
	// keypair authenticating the proxy as a staff principal. Empty in
	// local dev: the RFC 8032 test vector is used (only when ICHost is
	// a loopback address).
	ProxyIdentityPEMPath string

	// RootKeyDERHex overrides the IC root key. Mainnet uses the
	// hardcoded one; local replicas need this set (dfx-start prints the
	// root key on boot).
	RootKeyDERHex string
}

func Load() (*Config, error) {
	frontendURL, err := required("FRONTEND_URL")
	if err != nil {
		return nil, err
	}

	port, err := optionalPort("PORT", 3001)
	if err != nil {
		return nil, err
	}

	grafanaURL := os.Getenv("GRAFANA_URL")
	useFake := os.Getenv("USE_FAKE_METRICS") == "true" || grafanaURL == ""

	grafanaUser := os.Getenv("GRAFANA_USERNAME")
	grafanaPass := os.Getenv("GRAFANA_PASSWORD")
	if !useFake {
		if grafanaUser == "" || grafanaPass == "" {
			return nil, fmt.Errorf("GRAFANA_USERNAME and GRAFANA_PASSWORD are required when GRAFANA_URL is set")
		}
	}

	backendCanister, err := required("BACKEND_CANISTER_ID")
	if err != nil {
		return nil, err
	}

	icHost := os.Getenv("IC_HOST")
	if icHost == "" {
		icHost = "https://icp0.io"
	}

	iiCanister := os.Getenv("II_CANISTER_ID")
	if iiCanister == "" {
		iiCanister = "rdmx6-jaaaa-aaaaa-aaadq-cai"
	}

	rootKeyHex := os.Getenv("IC_ROOT_KEY_DER_HEX")
	if rootKeyHex != "" {
		if _, err := hex.DecodeString(rootKeyHex); err != nil {
			return nil, fmt.Errorf("IC_ROOT_KEY_DER_HEX is not valid hex: %w", err)
		}
	}

	return &Config{
		Port:                  port,
		FrontendURL:           frontendURL,
		GrafanaURL:            strings.TrimRight(grafanaURL, "/"),
		GrafanaUsername:       grafanaUser,
		GrafanaPassword:       grafanaPass,
		UseFakeMetrics:        useFake,
		ICHost:                icHost,
		IICanisterIDText:      iiCanister,
		BackendCanisterIDText: backendCanister,
		ProxyIdentityPEMPath:  os.Getenv("PROXY_IDENTITY_PEM"),
		RootKeyDERHex:         rootKeyHex,
	}, nil
}

func required(name string) (string, error) {
	v := os.Getenv(name)
	if v == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return v, nil
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
