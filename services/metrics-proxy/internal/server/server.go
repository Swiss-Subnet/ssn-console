package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/aviate-labs/agent-go/principal"
	"github.com/swiss-subnet/ssn-console/services/httpsvc"
	"github.com/swiss-subnet/ssn-console/services/httpsvc/iiauth"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/grafana"
	"github.com/swiss-subnet/ssn-console/services/metrics-proxy/internal/metrics"
)

const (
	defaultStep = time.Minute
	maxStep     = 24 * time.Hour
	maxRange    = 31 * 24 * time.Hour

	// APIPrefix is this service's API contract; Caddy and the frontend use the
	// same literal. The request path is signed into the iiauth challenge, so all
	// three must agree.
	APIPrefix = "/v0/metrics"
)

// Authorizer answers "which canister principals may user U read metrics
// for?". The production implementation is the backend.Client (an IC query
// to admin_list_user_readable_canister_principals); tests stub this directly.
type Authorizer interface {
	ListUserReadableCanisters(ctx context.Context, user principal.Principal) ([]principal.Principal, error)
}

type Deps struct {
	Querier        grafana.Querier
	AllowedOrigins []string
	Authorizer     Authorizer
	IIAuth         iiauth.Config
	AuthCacheTTL   time.Duration // per-principal authz reuse; defaults to 60s
	SessionTTL     time.Duration // session-token lifetime; defaults to 15min
}

type Server struct {
	handler http.Handler
}

func New(deps Deps) *Server {
	ttl := deps.AuthCacheTTL
	if ttl == 0 {
		ttl = 60 * time.Second
	}
	cache := newAuthCache(deps.Authorizer, ttl)

	sessionTTL := deps.SessionTTL
	if sessionTTL == 0 {
		sessionTTL = 15 * time.Minute
	}
	// Shares IIAuth.Now so session expiry tracks the same clock as the
	// delegation checks. Prod leaves it nil (real time); a frozen test
	// clock freezes session expiry too, which tests must account for.
	sessions := iiauth.NewSessionStore(sessionTTL, deps.IIAuth.Now)

	mux := http.NewServeMux()
	mux.HandleFunc("GET "+APIPrefix+"/status", handleStatus)
	mux.Handle("POST "+APIPrefix+"/session", iiauth.Middleware(deps.IIAuth, handleMintSession(sessions)))
	mux.HandleFunc("OPTIONS "+APIPrefix+"/session", httpsvc.Preflight(httpsvc.PreflightOpts{
		AllowedOrigins: deps.AllowedOrigins,
		Methods:        []string{http.MethodPost},
		AllowedHeaders: []string{iiauth.HeaderDelegation, iiauth.HeaderSignature, iiauth.HeaderTimestamp},
	}))
	mux.Handle("GET "+APIPrefix+"/list", iiauth.SessionMiddleware(sessions, http.HandlerFunc(handleListMetrics)))
	mux.Handle("GET "+APIPrefix+"/canisters/{id}/metrics/{slug}", iiauth.SessionMiddleware(sessions, handleQueryRange(deps, cache)))
	mux.HandleFunc("OPTIONS "+APIPrefix+"/canisters/{id}/metrics/{slug}", httpsvc.Preflight(httpsvc.PreflightOpts{
		AllowedOrigins: deps.AllowedOrigins,
		Methods:        []string{http.MethodGet},
		AllowedHeaders: []string{"Authorization"},
	}))

	return &Server{handler: httpsvc.WithCORS(mux, deps.AllowedOrigins)}
}

type mintSessionResponse struct {
	Token       string `json:"token"`
	ExpiresAtMS int64  `json:"expires_at_ms"`
}

func handleMintSession(store *iiauth.SessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caller, ok := iiauth.PrincipalFromContext(r.Context())
		if !ok {
			http.Error(w, "no caller principal", http.StatusUnauthorized)
			return
		}
		token, expiresAt, err := store.Mint(caller)
		if err != nil {
			log.Printf("mint session: %v", err)
			http.Error(w, "session mint failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, mintSessionResponse{
			Token:       token,
			ExpiresAtMS: expiresAt.UnixMilli(),
		})
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

func handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("ok"))
}

type metricEntry struct {
	Slug        string `json:"slug"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

func handleListMetrics(w http.ResponseWriter, _ *http.Request) {
	out := make([]metricEntry, 0)
	for _, m := range metrics.All() {
		out = append(out, metricEntry{Slug: m.Slug, Unit: m.Unit, Description: m.Description})
	}
	writeJSON(w, http.StatusOK, map[string]any{"metrics": out})
}

type rangeResponse struct {
	CanisterID  string          `json:"canister_id"`
	Metric      string          `json:"metric"`
	Unit        string          `json:"unit"`
	Description string          `json:"description"`
	Points      []grafana.Point `json:"points"`
}

func handleQueryRange(deps Deps, cache *authCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		canisterID := r.PathValue("id")
		slug := r.PathValue("slug")

		// Validate before PromQL interpolation. %q + the authz allowlist
		// stop forged queries from reaching Grafana even without this, but
		// rejecting non-principals at the door surfaces a 400 with a real
		// reason instead of a misleading 403.
		if _, err := principal.Decode(canisterID); err != nil {
			http.Error(w, "invalid canister id: "+err.Error(), http.StatusBadRequest)
			return
		}

		caller, ok := iiauth.PrincipalFromContext(r.Context())
		if !ok {
			http.Error(w, "no caller principal", http.StatusUnauthorized)
			return
		}
		allowed, err := cache.allows(r.Context(), caller, canisterID)
		if err != nil {
			log.Printf("authz lookup principal=%s canister=%s: %v", caller, canisterID, err)
			http.Error(w, "authorization lookup failed", http.StatusBadGateway)
			return
		}
		if !allowed {
			http.Error(w, "not authorized for this canister", http.StatusForbidden)
			return
		}
		metric, ok := metrics.Lookup(slug)
		if !ok {
			http.Error(w, "unknown metric", http.StatusNotFound)
			return
		}

		start, end, step, err := parseRange(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// canister_id label is the only variable in the query. The series
		// name comes from the server-owned catalogue, never from the URL.
		// %q is Go-quoted, not PromQL-quoted; safe here because canisterID
		// has already passed the allowlist check, and allowlist entries
		// are operator-controlled (env today, backend canister later).
		query := fmt.Sprintf(`%s{canister_id=%q}`, metric.Series, canisterID)

		points, err := deps.Querier.QueryRange(r.Context(), grafana.QueryRangeRequest{
			Query: query,
			Start: start,
			End:   end,
			Step:  step,
		})
		if err != nil {
			log.Printf("query_range canister=%s metric=%s: %v", canisterID, slug, err)
			http.Error(w, "upstream query failed", http.StatusBadGateway)
			return
		}

		writeJSON(w, http.StatusOK, rangeResponse{
			CanisterID:  canisterID,
			Metric:      slug,
			Unit:        metric.Unit,
			Description: metric.Description,
			Points:      points,
		})
	}
}

// parseRange interprets ?from=&to=&step= as RFC3339 timestamps and a Go
// duration. Defaults to "last 1 hour at 1 minute resolution". The bounds
// exist to keep a single proxy call from blowing up Grafana Cloud spend.
func parseRange(r *http.Request) (time.Time, time.Time, time.Duration, error) {
	now := time.Now().UTC()
	end := now
	start := now.Add(-1 * time.Hour)
	step := defaultStep

	if v := r.URL.Query().Get("from"); v != "" {
		t, err := parseTime(v)
		if err != nil {
			return time.Time{}, time.Time{}, 0, fmt.Errorf("invalid from: %w", err)
		}
		start = t
	}
	if v := r.URL.Query().Get("to"); v != "" {
		t, err := parseTime(v)
		if err != nil {
			return time.Time{}, time.Time{}, 0, fmt.Errorf("invalid to: %w", err)
		}
		end = t
	}
	if v := r.URL.Query().Get("step"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return time.Time{}, time.Time{}, 0, fmt.Errorf("invalid step: %w", err)
		}
		step = d
	}

	if !end.After(start) {
		return time.Time{}, time.Time{}, 0, fmt.Errorf("to must be after from")
	}
	if end.Sub(start) > maxRange {
		return time.Time{}, time.Time{}, 0, fmt.Errorf("range exceeds %s", maxRange)
	}
	if step < time.Second {
		return time.Time{}, time.Time{}, 0, fmt.Errorf("step must be >= 1s")
	}
	if step > maxStep {
		return time.Time{}, time.Time{}, 0, fmt.Errorf("step exceeds %s", maxStep)
	}
	return start, end, step, nil
}

func parseTime(v string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return t.UTC(), nil
	}
	// Allow unix seconds as a fallback; Grafana's own UI talks in seconds.
	if n, err := strconv.ParseInt(v, 10, 64); err == nil {
		return time.Unix(n, 0).UTC(), nil
	}
	return time.Time{}, fmt.Errorf("expected RFC3339 or unix seconds")
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
