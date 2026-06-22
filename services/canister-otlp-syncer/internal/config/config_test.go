package config

import (
	"testing"
	"time"
)

func setRequired(t *testing.T) {
	t.Helper()
	t.Setenv("CANISTER_ID_BACKEND", "aaaaa-aa")
	t.Setenv("CANISTER_ID_CYCLES_MONITOR", "aaaaa-aa")
	t.Setenv("HTTP_GATEWAY", "http://127.0.0.1:4943")
	t.Setenv("PRIVATE_KEY", "pem")
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4318")
}

func TestLoadSyncIntervalUnsetIsOneShot(t *testing.T) {
	setRequired(t)
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.SyncInterval != 0 {
		t.Fatalf("SyncInterval = %v, want 0 (one-shot)", cfg.SyncInterval)
	}
}

func TestLoadSyncIntervalParsed(t *testing.T) {
	setRequired(t)
	t.Setenv("SYNC_INTERVAL", "30s")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.SyncInterval != 30*time.Second {
		t.Fatalf("SyncInterval = %v, want 30s", cfg.SyncInterval)
	}
}

func TestLoadSyncIntervalInvalid(t *testing.T) {
	setRequired(t)
	t.Setenv("SYNC_INTERVAL", "nonsense")
	if _, err := Load(); err == nil {
		t.Fatal("Load: want error for invalid SYNC_INTERVAL, got nil")
	}
}
