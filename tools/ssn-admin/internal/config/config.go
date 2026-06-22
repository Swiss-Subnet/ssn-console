package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	ICHost          string // IC_HOST; defaults to local replica
	BackendCanister string // CANISTER_ID_BACKEND
	IdentityPEM     string // ADMIN_IDENTITY_PEM; empty => RFC 8032 test vector (local only)
}

func (c Config) FetchRootKey() bool {
	return isLocal(c.ICHost)
}

func Load() (*Config, error) {
	icHost := os.Getenv("IC_HOST")
	if icHost == "" {
		icHost = "http://127.0.0.1:4943"
	}
	backend := os.Getenv("CANISTER_ID_BACKEND")
	if backend == "" {
		return nil, fmt.Errorf("CANISTER_ID_BACKEND is required")
	}
	return &Config{
		ICHost:          icHost,
		BackendCanister: backend,
		IdentityPEM:     os.Getenv("ADMIN_IDENTITY_PEM"),
	}, nil
}

func isLocal(host string) bool {
	h := strings.ToLower(host)
	return strings.Contains(h, "127.0.0.1") ||
		strings.Contains(h, "localhost") ||
		strings.Contains(h, "0.0.0.0")
}
