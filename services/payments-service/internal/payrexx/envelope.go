package payrexx

import (
	"encoding/json"
	"fmt"
)

// Envelope is the response shape every Payrexx endpoint shares.
//
//	{
//	  "status":  "success" | "error",
//	  "data":    [...]      // present on success; shape depends on endpoint
//	  "message": "..."      // present on error
//	}
//
// Data is left as RawMessage so callers can decode it into the right
// concrete type for the endpoint they hit.
type Envelope struct {
	Status  string          `json:"status"`
	Data    json.RawMessage `json:"data,omitempty"`
	Message string          `json:"message,omitempty"`
}

// DecodeEnvelope parses a Payrexx response body into an Envelope and
// returns an error if status != "success".
func DecodeEnvelope(body []byte) (*Envelope, error) {
	var env Envelope
	if err := json.Unmarshal(body, &env); err != nil {
		return nil, fmt.Errorf("payrexx: decode envelope: %w (body=%s)", err, truncate(body, 256))
	}
	if env.Status != "success" {
		return &env, fmt.Errorf("payrexx: api error: status=%q message=%q", env.Status, env.Message)
	}
	return &env, nil
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "..."
}
