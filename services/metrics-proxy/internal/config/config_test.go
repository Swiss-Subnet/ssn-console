package config

import "testing"

func TestLoad_RejectsGrafanaURLWithoutCredentials(t *testing.T) {
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	t.Setenv("CANISTER_ID_BACKEND", "aaaaa-aa")
	t.Setenv("GRAFANA_URL", "https://example.grafana.net/api/prom")
	t.Setenv("GRAFANA_USERNAME", "")
	t.Setenv("GRAFANA_PASSWORD", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error when GRAFANA_URL is set without credentials")
	}
}

func TestLoad_FakeWhenGrafanaURLEmpty(t *testing.T) {
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	t.Setenv("CANISTER_ID_BACKEND", "aaaaa-aa")
	t.Setenv("GRAFANA_URL", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !cfg.UseFakeMetrics {
		t.Fatal("expected UseFakeMetrics=true when GRAFANA_URL is empty")
	}
}

func TestLoad_RequiresBackendCanisterID(t *testing.T) {
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	if _, err := Load(); err == nil {
		t.Fatal("expected error when CANISTER_ID_BACKEND is missing")
	}
}

func TestLoad_DefaultICHostAndIICanister(t *testing.T) {
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	t.Setenv("CANISTER_ID_BACKEND", "aaaaa-aa")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.ICHost != "https://icp0.io" {
		t.Errorf("unexpected ICHost default: %q", cfg.ICHost)
	}
	if cfg.IICanisterIDText != "rdmx6-jaaaa-aaaaa-aaadq-cai" {
		t.Errorf("unexpected IICanisterIDText default: %q", cfg.IICanisterIDText)
	}
}

func TestLoad_RejectsInvalidRootKeyHex(t *testing.T) {
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	t.Setenv("CANISTER_ID_BACKEND", "aaaaa-aa")
	t.Setenv("IC_ROOT_KEY_DER_HEX", "not-hex")
	if _, err := Load(); err == nil {
		t.Fatal("expected error on invalid hex root key")
	}
}
