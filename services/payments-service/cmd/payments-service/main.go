package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/config"
	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/payrexx"
	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/server"
	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/telemetry"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("payments-service: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	shutdownTelemetry, err := telemetry.Setup(ctx, telemetry.Config{
		ServiceName:        "payments-service",
		ServiceNamespace:   "ssn",
		GrafanaEnvironment: cfg.GrafanaEnvironment,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownTelemetry(shutdownCtx); err != nil {
			log.Printf("telemetry shutdown: %v", err)
		}
	}()

	paymentsServer := server.New(server.Deps{
		Payrexx: payrexx.NewClient(cfg.PayrexxBaseURL, cfg.PayrexxInstanceName, cfg.PayrexxAPISecret),
	})

	srv := &http.Server{
		Addr:              "0.0.0.0:" + strconv.Itoa(cfg.Port),
		Handler:           paymentsServer,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("payments-service listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("listen: %v", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	return nil
}
