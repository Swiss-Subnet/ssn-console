package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/canister"
	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/config"
	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/otlp"
	"github.com/swiss-subnet/ssn-console/services/canister-otlp-syncer/internal/sync"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("canister-otlp-syncer: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	id, err := canister.IdentityFromPEM(cfg.PrivateKeyPEM)
	if err != nil {
		return err
	}

	client, err := canister.New(canister.Config{
		HTTPGateway:             cfg.HTTPGateway,
		Identity:                id,
		BackendCanisterID:       cfg.BackendCanisterID,
		CyclesMonitorCanisterID: cfg.CyclesMonitorCanisterID,
		FetchRootKey:            isLocal(cfg.HTTPGateway),
	})
	if err != nil {
		return err
	}

	log.Printf("starting one-shot sync as %s", client.Sender())

	return sync.Run(ctx, sync.Deps{
		Client:      client,
		Pusher:      otlp.NewPusher(cfg.MetricsEndpoint, &http.Client{Timeout: 30 * time.Second}),
		Environment: cfg.GrafanaEnvironment,
	})
}

func isLocal(host string) bool {
	h := strings.ToLower(host)
	return strings.Contains(h, "127.0.0.1") || strings.Contains(h, "localhost") || strings.Contains(h, "0.0.0.0")
}
