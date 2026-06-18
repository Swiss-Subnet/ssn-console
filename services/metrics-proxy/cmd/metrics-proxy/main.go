package main

import (
	"context"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/aviate-labs/agent-go/certification"
	"github.com/aviate-labs/agent-go/principal"
	"github.com/swiss-subnet/ssn-console/services/httpsvc/iiauth"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/backend"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/config"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/grafana"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/server"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("metrics-proxy: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var querier grafana.Querier
	if cfg.UseFakeMetrics {
		log.Print("metrics-proxy: using fake in-memory metrics (GRAFANA_URL unset or USE_FAKE_METRICS=true)")
		querier = grafana.NewFake()
	} else {
		querier = grafana.NewHTTPClient(cfg.GrafanaURL, cfg.GrafanaUsername, cfg.GrafanaPassword)
	}

	iiCanisterID, err := principal.Decode(cfg.IICanisterIDText)
	if err != nil {
		return err
	}
	backendCanisterID, err := principal.Decode(cfg.BackendCanisterIDText)
	if err != nil {
		return err
	}

	id, err := backend.LoadIdentity(cfg.ProxyIdentityPEM, cfg.ICHost)
	if err != nil {
		return err
	}
	log.Printf("metrics-proxy authenticated as principal=%s", id.Sender())
	log.Printf(
		"to grant READ_METRICS:\n"+
			"  dfx canister call backend admin_grant_service_principal_permissions \\\n"+
			"    '(record { service_principal = principal \"%s\"; permissions = record { read_all_orgs=false; write_billing=false; manage_users=false; read_metrics=true } })'",
		id.Sender(),
	)

	bc, err := backend.New(backend.Config{
		ICHost:       cfg.ICHost,
		CanisterID:   backendCanisterID,
		Identity:     id,
		FetchRootKey: isLocalHost(cfg.ICHost),
	})
	if err != nil {
		return err
	}

	// Prefer an explicit override; otherwise use whatever root key the
	// agent ended up with (fetched for local, mainnet hardcoded otherwise).
	var rootKey []byte
	if cfg.RootKeyDERHex != "" {
		rootKey, err = resolveRootKey(cfg.RootKeyDERHex)
		if err != nil {
			return err
		}
	} else {
		rootKey = bc.RootKey()
	}

	srv := &http.Server{
		Addr: "0.0.0.0:" + strconv.Itoa(cfg.Port),
		Handler: server.New(server.Deps{
			Querier:        querier,
			AllowedOrigins: cfg.AllowedOrigins,
			Authorizer:     bc,
			IIAuth: iiauth.Config{
				IICanisterID:  iiCanisterID,
				RootPublicKey: rootKey,
			},
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("metrics-proxy listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("listen: %v", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

func resolveRootKey(rootKeyHex string) ([]byte, error) {
	if rootKeyHex == "" {
		return hex.DecodeString(certification.RootKey)
	}
	return hex.DecodeString(rootKeyHex)
}

func isLocalHost(host string) bool {
	h := strings.ToLower(host)
	for _, needle := range []string{"127.0.0.1", "localhost", "0.0.0.0"} {
		if strings.Contains(h, needle) {
			return true
		}
	}
	return false
}
