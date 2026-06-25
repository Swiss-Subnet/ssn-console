// Package backend is the metrics-proxy's client for the on-chain backend
// canister. It calls admin_list_user_readable_canister_principals to learn
// which canisters a given user is allowed to see metrics for.
package backend

import (
	"context"
	"fmt"
	"net/url"

	"github.com/aviate-labs/agent-go"
	"github.com/aviate-labs/agent-go/identity"
	"github.com/aviate-labs/agent-go/principal"

	gen "github.com/swiss-subnet/ssn-console/services/canister-clients/backend"
)

type Client struct {
	agent *gen.BackendAgent
}

type Config struct {
	// ICHost is the replica URL (https://icp0.io for mainnet, or local
	// replica URL like http://127.0.0.1:4943).
	ICHost string

	// CanisterID is the backend canister exposing
	// admin_list_user_readable_canister_principals.
	CanisterID principal.Principal

	// Identity authenticates the proxy as a staff principal holding the
	// READ_METRICS permission.
	Identity identity.Identity

	// FetchRootKey must be true for local replicas (their root key is
	// not the mainnet one). Leave false in production.
	FetchRootKey bool
}

func New(cfg Config) (*Client, error) {
	host, err := url.Parse(cfg.ICHost)
	if err != nil {
		return nil, fmt.Errorf("parse IC host: %w", err)
	}
	a, err := gen.NewBackendAgent(cfg.CanisterID, agent.Config{
		Identity:     cfg.Identity,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey,
	})
	if err != nil {
		return nil, fmt.Errorf("new agent: %w", err)
	}
	return &Client{agent: a}, nil
}

// RootKey returns the IC root public key the agent fetched (or the
// hardcoded mainnet one if FetchRootKey was false). Exposed so the
// iiauth verifier can use the same key, which matters for local
// replicas whose root key is per-deployment.
func (c *Client) RootKey() []byte {
	return c.agent.GetRootKey()
}

// ListUserReadableCanisters asks the backend canister which canisters
// the given user is allowed to read metrics for. Returns the flat list
// of canister principals; an empty list is a valid result and means
// "user exists but owns nothing the proxy may serve."
//
// The generated typed method is non-context; call the embedded agent's
// QueryWithContext directly so request cancellation propagates.
func (c *Client) ListUserReadableCanisters(ctx context.Context, user principal.Principal) ([]principal.Principal, error) {
	req := gen.ListUserReadableCanisterPrincipalsRequest{UserPrincipal: user}
	var res gen.ListUserReadableCanisterPrincipalsResponse
	if err := c.agent.QueryWithContext(
		ctx,
		c.agent.CanisterId,
		"admin_list_user_readable_canister_principals",
		[]any{req},
		[]any{&res},
	); err != nil {
		return nil, fmt.Errorf("query canister: %w", err)
	}
	if res.Err != nil {
		return nil, fmt.Errorf("canister error: %s", res.Err.Message)
	}
	if res.Ok == nil {
		return nil, fmt.Errorf("canister returned neither Ok nor Err")
	}
	return res.Ok.CanisterPrincipals, nil
}
