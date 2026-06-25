package sync

import (
	"context"
	"fmt"
	"net/url"

	"github.com/aviate-labs/agent-go"
	"github.com/aviate-labs/agent-go/identity"
	"github.com/aviate-labs/agent-go/principal"

	backendgen "github.com/swiss-subnet/ssn-console/services/canister-clients/backend"
	cmgen "github.com/swiss-subnet/ssn-console/services/canister-clients/cyclesmonitor"
)

// client is the production Canister: it fans calls across the backend and
// cycles-monitor canisters via the generated typed agents.
type client struct {
	backend       *backendgen.BackendAgent
	cyclesMonitor *cmgen.CyclesmonitorAgent
}

type ClientConfig struct {
	HTTPGateway             string
	Identity                identity.Identity
	BackendCanisterID       string
	CyclesMonitorCanisterID string
	FetchRootKey            bool
}

func NewClient(cfg ClientConfig) (*client, error) {
	host, err := url.Parse(cfg.HTTPGateway)
	if err != nil {
		return nil, fmt.Errorf("parse host: %w", err)
	}
	backendID, err := principal.Decode(cfg.BackendCanisterID)
	if err != nil {
		return nil, fmt.Errorf("decode backend canister id: %w", err)
	}
	cyclesMonitorID, err := principal.Decode(cfg.CyclesMonitorCanisterID)
	if err != nil {
		return nil, fmt.Errorf("decode cycles-monitor canister id: %w", err)
	}
	agentCfg := agent.Config{
		Identity:     cfg.Identity,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey,
	}
	b, err := backendgen.NewBackendAgent(backendID, agentCfg)
	if err != nil {
		return nil, fmt.Errorf("new backend agent: %w", err)
	}
	cm, err := cmgen.NewCyclesmonitorAgent(cyclesMonitorID, agentCfg)
	if err != nil {
		return nil, fmt.Errorf("new cycles-monitor agent: %w", err)
	}
	return &client{backend: b, cyclesMonitor: cm}, nil
}

func (c *client) Sender() principal.Principal { return c.backend.Sender() }

// ListMetricsAfter is an update call by design: the canister refuses to
// expose metrics via query. The generated typed method is non-context, so
// call the embedded agent's CallWithContext directly for cancellation.
func (c *client) ListMetricsAfter(ctx context.Context, cursor *cmgen.Cursor) ([]cmgen.CyclesMetricsSnapshotDto, *cmgen.Cursor, error) {
	req := cmgen.ListMetricsAfterRequest{Cursor: cursor}
	var res cmgen.ListMetricsAfterResponse
	if err := c.cyclesMonitor.CallWithContext(ctx, c.cyclesMonitor.CanisterId, "list_metrics_after", []any{req}, []any{&res}); err != nil {
		return nil, nil, fmt.Errorf("call list_metrics_after: %w", err)
	}
	if res.Err != nil {
		return nil, nil, fmt.Errorf("cycles-monitor error: %s", res.Err.Message)
	}
	if res.Ok == nil {
		return nil, nil, fmt.Errorf("cycles-monitor returned neither Ok nor Err")
	}
	return res.Ok.Snapshots, res.Ok.NextCursor, nil
}

// record_usage is authorized by caller principal: must match the backend's PUBLIC_KEY.
func (c *client) RecordUsage(ctx context.Context, usages []backendgen.CanisterUsage) error {
	req := backendgen.RecordUsageRequest{Usages: usages}
	var res backendgen.RecordUsageResponse
	if err := c.backend.CallWithContext(ctx, c.backend.CanisterId, "record_usage", []any{req}, []any{&res}); err != nil {
		return fmt.Errorf("call record_usage: %w", err)
	}
	if res.Err != nil {
		return fmt.Errorf("backend error: %s", res.Err.Message)
	}
	return nil
}
