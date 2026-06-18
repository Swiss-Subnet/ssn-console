// Package httpsvc holds small HTTP building blocks shared across the Go
// services in this repository.
package httpsvc

import (
	"net/http"
	"strings"
)

// NormalizeOrigin strips surrounding space and a trailing slash so a config
// value still matches a browser Origin header (which never has one).
func NormalizeOrigin(o string) string {
	return strings.TrimRight(strings.TrimSpace(o), "/")
}

func originAllowed(origin string, allowed []string) bool {
	for _, a := range allowed {
		if origin == a {
			return true
		}
	}
	return false
}

// WithCORS wraps next so that:
//   - requests with no Origin header (curl, server-to-server) pass through;
//   - requests whose Origin is in allowedOrigins pass through and get the
//     matching Access-Control-Allow-Origin response header;
//   - cross-origin requests from any other Origin are rejected with 403
//     before the handler runs.
//
// The third bullet is the reason this exists. A "set the header only when
// it matches, otherwise no-op" middleware lets the browser block the
// response but still runs the handler, which leaks side effects (rate
// limiter ticks, upstream queries, audit logs) to attackers picking any
// origin. allowedOrigins must already be normalized (see NormalizeOrigin).
func WithCORS(next http.Handler, allowedOrigins []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && !originAllowed(origin, allowedOrigins) {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		next.ServeHTTP(w, r)
	})
}

// PreflightOpts configures the Preflight handler.
type PreflightOpts struct {
	AllowedOrigins []string
	Methods        []string
	AllowedHeaders []string
}

// Preflight returns an OPTIONS handler that answers CORS preflight checks.
// Content-Type is always allowed; additional headers must be listed in
// AllowedHeaders for the browser to permit them on the real request.
func Preflight(opts PreflightOpts) http.HandlerFunc {
	allowMethods := strings.Join(append(opts.Methods, http.MethodOptions), ", ")
	headers := append([]string{"Content-Type"}, opts.AllowedHeaders...)
	allowHeaders := strings.Join(headers, ", ")
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if !originAllowed(origin, opts.AllowedOrigins) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", allowMethods)
		w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
		w.Header().Set("Access-Control-Max-Age", "600")
		w.Header().Set("Vary", "Origin")
		w.WriteHeader(http.StatusNoContent)
	}
}
