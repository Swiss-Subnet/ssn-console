package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/swiss-subnet/ssn-console/services/httpsvc"
)

type Config struct {
	Port       int
	PrivateKey string
	// FrontendURL is the canonical URL used to build magic links (first origin).
	FrontendURL string
	// AllowedOrigins is the CORS allowlist parsed from FRONTEND_URL (comma-separated).
	AllowedOrigins []string

	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	GrafanaEnvironment string
}

func Load() (*Config, error) {
	privateKey, err := required("PRIVATE_KEY")
	if err != nil {
		return nil, err
	}
	frontendURL, err := required("FRONTEND_URL")
	if err != nil {
		return nil, err
	}
	allowedOrigins := parseOrigins(frontendURL)
	smtpHost, err := required("SMTP_HOST")
	if err != nil {
		return nil, err
	}
	smtpUser, smtpPass, err := smtpCredentials()
	if err != nil {
		return nil, err
	}
	smtpPort, err := optionalPort("SMTP_PORT", 587)
	if err != nil {
		return nil, err
	}
	port, err := optionalPort("PORT", 3000)
	if err != nil {
		return nil, err
	}

	return &Config{
		Port:               port,
		PrivateKey:         privateKey,
		FrontendURL:        allowedOrigins[0],
		AllowedOrigins:     allowedOrigins,
		SMTPHost:           smtpHost,
		SMTPPort:           smtpPort,
		SMTPUser:           smtpUser,
		SMTPPass:           smtpPass,
		SMTPFrom:           optional("SMTP_FROM", `"Swiss Subnet" <noreply@subnet.ch>`),
		GrafanaEnvironment: os.Getenv("GRAFANA_ENVIRONMENT"),
	}, nil
}

// parseOrigins splits FRONTEND_URL on commas and normalizes each entry.
// The first is canonical (used for magic links); all are CORS-allowed.
func parseOrigins(v string) []string {
	var out []string
	for _, p := range strings.Split(v, ",") {
		if o := httpsvc.NormalizeOrigin(p); o != "" {
			out = append(out, o)
		}
	}
	return out
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

// SMTP_USER and SMTP_PASS are all-or-nothing: one without the other would
// silently send unauthenticated mail.
func smtpCredentials() (string, string, error) {
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	if (user == "") != (pass == "") {
		return "", "", fmt.Errorf("SMTP_USER and SMTP_PASS must be set together, or both left empty")
	}
	return user, pass, nil
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
