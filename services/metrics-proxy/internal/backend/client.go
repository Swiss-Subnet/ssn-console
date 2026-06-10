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
)

type Client struct {
	agent      *agent.Agent
	canisterID principal.Principal
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
	a, err := agent.New(agent.Config{
		Identity:     cfg.Identity,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey,
	})
	if err != nil {
		return nil, fmt.Errorf("new agent: %w", err)
	}
	return &Client{
		agent:      a,
		canisterID: cfg.CanisterID,
	}, nil
}

// Sender returns the principal the agent calls as. Useful for logging on
// startup so the operator can grant READ_METRICS to this principal.
func (c *Client) Sender() principal.Principal {
	return c.agent.Sender()
}

// RootKey returns the IC root public key the agent fetched (or the
// hardcoded mainnet one if FetchRootKey was false). Exposed so the
// iiauth verifier can use the same key, which matters for local
// replicas whose root key is per-deployment.
func (c *Client) RootKey() []byte {
	return c.agent.GetRootKey()
}

type listUserReadableCanisterPrincipalsRequest struct {
	UserPrincipal principal.Principal `ic:"user_principal"`
}

type listUserReadableCanisterPrincipalsResponse struct {
	CanisterPrincipals []principal.Principal `ic:"canister_principals"`
}

type apiError struct {
	Code    string `ic:"code"`
	Message string `ic:"message"`
}

// apiResult mirrors the canister's ApiResultDto<T> = variant { Ok : T;
// Err : ApiError }.
type apiResult[T any] struct {
	Ok  *T        `ic:"Ok,variant"`
	Err *apiError `ic:"Err,variant"`
}

// ListUserReadableCanisters asks the backend canister which canisters
// the given user is allowed to read metrics for. Returns the flat list
// of canister principals; an empty list is a valid result and means
// "user exists but owns nothing the proxy may serve."
func (c *Client) ListUserReadableCanisters(ctx context.Context, user principal.Principal) ([]principal.Principal, error) {
	req := listUserReadableCanisterPrincipalsRequest{UserPrincipal: user}
	var res apiResult[listUserReadableCanisterPrincipalsResponse]
	if err := c.agent.QueryWithContext(
		ctx,
		c.canisterID,
		"admin_list_user_readable_canister_principals",
		[]any{req},
		[]any{&res},
	); err != nil {
		return nil, fmt.Errorf("query canister: %w", err)
	}
	if res.Err != nil {
		return nil, fmt.Errorf("canister error %s: %s", res.Err.Code, res.Err.Message)
	}
	if res.Ok == nil {
		return nil, fmt.Errorf("canister returned neither Ok nor Err")
	}
	return res.Ok.CanisterPrincipals, nil
}
