package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/config"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/server"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/telemetry"
	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/token"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("auth-service: %v", err)
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
		ServiceName:        "auth-service",
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
			slog.Error("telemetry shutdown", "err", err)
		}
	}()

	signer, err := token.NewSigner(token.Options{PrivateKeyPEM: cfg.PrivateKey})
	if err != nil {
		return fmt.Errorf("signer: %w", err)
	}

	mailService := mailer.NewSMTP(mailer.SMTPConfig{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
	})

	authServer := server.New(server.Deps{
		Signer:         signer,
		Mailer:         mailService,
		FrontendURL:    cfg.FrontendURL,
		AllowedOrigins: cfg.AllowedOrigins,
		SMTPFrom:       cfg.SMTPFrom,
	})

	srv := &http.Server{
		Addr:              "0.0.0.0:" + strconv.Itoa(cfg.Port),
		Handler:           authServer,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.Info("auth-service listening", "addr", srv.Addr, "frontend_url", cfg.FrontendURL)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("listen", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}

	// Drain background mail sends. Bounded so a stuck SMTP server can't
	// hold the process open indefinitely.
	drainCtx, cancelDrain := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelDrain()
	if err := authServer.Wait(drainCtx); err != nil {
		slog.Error("drain background sends", "err", err)
	}
	return nil
}
