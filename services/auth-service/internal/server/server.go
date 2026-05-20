package server

import (
	"bytes"
	"context"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"sync"
	"time"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

const tokenTTL = 15 * time.Minute

// backgroundSendTimeout bounds each detached SMTP send. The handler returns
// 202 before the send starts, so this is independent of the HTTP request.
const backgroundSendTimeout = 30 * time.Second

const maxInFlightSends = 32
const perEmailThrottle = 60 * time.Second
const throttleSweepThreshold = 4096

// Signer mints purpose-tagged tokens. Kept as an interface so tests can
// stub it the same way the mailer is stubbed.
type Signer interface {
	SignEmailVerification(email string, ttl time.Duration) (string, error)
	SignAccountRecovery(email string, ttl time.Duration) (string, error)
}

type Deps struct {
	Signer      Signer
	Mailer      mailer.Mailer
	FrontendURL string
	SMTPFrom    string
}

// Server wraps the HTTP handler and tracks background mail sends so they
// can be drained on shutdown.
type Server struct {
	handler http.Handler
	wg      sync.WaitGroup
	sem     chan struct{}
	now     func() time.Time

	throttleMu sync.Mutex
	throttle   map[throttleKey]time.Time
}

// Throttling is per-purpose so a verification request and a recovery
// request for the same email don't share a rate-limit budget.
type throttleKey struct {
	purpose string
	email   string
}

func New(deps Deps) *Server {
	s := &Server{
		sem:      make(chan struct{}, maxInFlightSends),
		now:      time.Now,
		throttle: make(map[throttleKey]time.Time),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /status", handleStatus)
	mux.HandleFunc("POST /v1.0/auth/email-verification", s.handleMintAndMail(deps, emailVerificationFlow))
	mux.HandleFunc("OPTIONS /v1.0/auth/email-verification", handlePreflight(deps.FrontendURL))
	mux.HandleFunc("POST /v1.0/auth/account-recovery", s.handleMintAndMail(deps, accountRecoveryFlow))
	mux.HandleFunc("OPTIONS /v1.0/auth/account-recovery", handlePreflight(deps.FrontendURL))
	s.handler = otelhttp.NewHandler(withCORS(mux, deps.FrontendURL), "auth-service")
	return s
}

func withCORS(next http.Handler, allowedOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Vary", "Origin")
		}
		next.ServeHTTP(w, r)
	})
}

func handlePreflight(allowedOrigin string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != allowedOrigin {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "600")
		w.Header().Set("Vary", "Origin")
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

// Wait blocks until every in-flight background send finishes or ctx expires.
// Returns ctx.Err() on timeout, nil otherwise.
func (s *Server) Wait(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("ok"))
}

type emailRequest struct {
	Email string `json:"email"`
}

// validEmail accepts bare addresses (no display name, no angle brackets).
// The real check is whether the email arrives; this just rejects obvious
// junk before we mint a token.
func validEmail(s string) bool {
	addr, err := mail.ParseAddress(s)
	return err == nil && addr.Address == s && addr.Name == ""
}

// Both endpoints take tiny JSON ({"email":"..."}). Cap the body at 1 KiB so
// a malicious client can't make us allocate unbounded memory.
const maxRequestBody = 1 << 10

// Shared shape for the verification and recovery endpoints. Only the
// purpose, link path, and email copy differ; throttle/202/background-send
// plumbing is identical.
type mintAndMailFlow struct {
	purpose      string
	sign         func(s Signer, email string, ttl time.Duration) (string, error)
	frontendPath string
	subject      string
	html         *template.Template
	textTemplate func(link string) string
}

var verificationEmailHTML = template.Must(template.New("verify").Parse(
	`<p>Click <a href="{{.Link}}">here</a> to sign in to SSN Console.</p>` +
		`<p>This link will expire in 15 minutes.</p>`,
))

var recoveryEmailHTML = template.Must(template.New("recover").Parse(
	`<p>Click <a href="{{.Link}}">here</a> to recover access to your SSN Console account ` +
		`from a new Internet Identity.</p>` +
		`<p>If you did not request this, you can ignore this email.</p>` +
		`<p>This link will expire in 15 minutes.</p>`,
))

var emailVerificationFlow = mintAndMailFlow{
	purpose: "email_verification",
	sign: func(s Signer, email string, ttl time.Duration) (string, error) {
		return s.SignEmailVerification(email, ttl)
	},
	frontendPath: "/verify",
	subject:      "Swiss Subnet Email Verification",
	html:         verificationEmailHTML,
	textTemplate: func(link string) string {
		return "Sign in to SSN Console by visiting this link: " + link +
			"\nThis link will expire in 15 minutes."
	},
}

var accountRecoveryFlow = mintAndMailFlow{
	purpose: "account_recovery",
	sign: func(s Signer, email string, ttl time.Duration) (string, error) {
		return s.SignAccountRecovery(email, ttl)
	},
	frontendPath: "/recover",
	subject:      "Swiss Subnet Account Recovery",
	html:         recoveryEmailHTML,
	textTemplate: func(link string) string {
		return "Recover access to your SSN Console account by visiting this link: " + link +
			"\nIf you did not request this, you can ignore this email." +
			"\nThis link will expire in 15 minutes."
	},
}

func (s *Server) handleMintAndMail(deps Deps, flow mintAndMailFlow) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Always 202 so callers can't distinguish valid/invalid/throttled.
		defer w.WriteHeader(http.StatusAccepted)

		r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)
		var req emailRequest
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil {
			return
		}
		if !validEmail(req.Email) {
			return
		}
		if !s.allowSend(flow.purpose, req.Email) {
			return
		}

		jwt, err := flow.sign(deps.Signer, req.Email, tokenTTL)
		if err != nil {
			log.Printf("sign token (%s): %v", flow.purpose, err)
			return
		}

		link := deps.FrontendURL + flow.frontendPath + "?token=" + url.QueryEscape(jwt)
		var htmlBuf bytes.Buffer
		if err := flow.html.Execute(&htmlBuf, struct{ Link string }{link}); err != nil {
			log.Printf("render email (%s): %v", flow.purpose, err)
			return
		}
		msg := mailer.Message{
			From:    deps.SMTPFrom,
			To:      req.Email,
			Subject: flow.subject,
			HTML:    htmlBuf.String(),
			Text:    flow.textTemplate(link),
		}

		// Non-blocking: drop rather than queue (would just move the unbounded
		// growth into the channel) or block the handler.
		select {
		case s.sem <- struct{}{}:
		default:
			log.Printf("send mail to %s (%s): dropped, in-flight cap reached", msg.To, flow.purpose)
			return
		}

		// Detach the send: the client gets 202 without waiting for SMTP.
		// Fresh context so writing the response doesn't cancel the send.
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			defer func() { <-s.sem }()
			ctx, cancel := context.WithTimeout(context.Background(), backgroundSendTimeout)
			defer cancel()
			if err := deps.Mailer.Send(ctx, msg); err != nil {
				log.Printf("send mail to %s (%s): %v", msg.To, flow.purpose, err)
			}
		}()
	}
}

func (s *Server) allowSend(purpose, email string) bool {
	now := s.now()
	key := throttleKey{purpose: purpose, email: email}
	s.throttleMu.Lock()
	defer s.throttleMu.Unlock()

	if last, ok := s.throttle[key]; ok && now.Sub(last) < perEmailThrottle {
		return false
	}
	if len(s.throttle) >= throttleSweepThreshold {
		for k, t := range s.throttle {
			if now.Sub(t) >= perEmailThrottle {
				delete(s.throttle, k)
			}
		}
	}
	s.throttle[key] = now
	return true
}
