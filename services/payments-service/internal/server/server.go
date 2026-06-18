package server

import (
	"encoding/json"
	"net/http"

	"github.com/swiss-subnet/ssn-console/services/payments-service/internal/payrexx"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// APIPrefix is this service's API contract; Caddy uses the same literal.
const APIPrefix = "/v0/payrexx"

type Deps struct {
	Payrexx *payrexx.Client
}

type Server struct {
	handler http.Handler
}

func New(deps Deps) *Server {
	mux := http.NewServeMux()
	mux.HandleFunc("GET "+APIPrefix+"/status", handleStatus)
	mux.HandleFunc("POST "+APIPrefix+"/signature-check", handleSignatureCheck(deps.Payrexx))

	return &Server{
		handler: otelhttp.NewHandler(mux, "payments-service"),
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

func handleStatus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("ok"))
}

func handleSignatureCheck(c *payrexx.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status, err := c.SignatureCheck(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			// Don't surface the wrapped error to the caller -- the payrexx
			// client embeds the upstream URL on network failures.
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "payrexx upstream error"})
			return
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]int{"payrexx_status": status})
	}
}
