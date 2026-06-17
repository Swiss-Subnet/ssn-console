package canister

import (
	"context"
	"fmt"
	"net/url"

	"github.com/aviate-labs/agent-go"
	"github.com/aviate-labs/agent-go/candid/idl"
	"github.com/aviate-labs/agent-go/identity"
	"github.com/aviate-labs/agent-go/principal"
)

type Client struct {
	agent         *agent.Agent
	backend       principal.Principal
	cyclesMonitor principal.Principal
}

type Config struct {
	HTTPGateway             string
	Identity                identity.Identity
	BackendCanisterID       string
	CyclesMonitorCanisterID string
	FetchRootKey            bool
}

func New(cfg Config) (*Client, error) {
	host, err := url.Parse(cfg.HTTPGateway)
	if err != nil {
		return nil, fmt.Errorf("parse host: %w", err)
	}
	backend, err := principal.Decode(cfg.BackendCanisterID)
	if err != nil {
		return nil, fmt.Errorf("decode backend canister id: %w", err)
	}
	cyclesMonitor, err := principal.Decode(cfg.CyclesMonitorCanisterID)
	if err != nil {
		return nil, fmt.Errorf("decode cycles-monitor canister id: %w", err)
	}
	a, err := agent.New(agent.Config{
		Identity:     cfg.Identity,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey,
	})
	if err != nil {
		return nil, fmt.Errorf("new agent: %w", err)
	}
	return &Client{agent: a, backend: backend, cyclesMonitor: cyclesMonitor}, nil
}

func (c *Client) Sender() principal.Principal { return c.agent.Sender() }

type apiError struct {
	Code    string `ic:"code"`
	Message string `ic:"message"`
}

type Cursor struct {
	TimestampNS uint64              `ic:"0,tuple"`
	CanisterID  principal.Principal `ic:"1,tuple"`
}

type listMetricsAfterRequest struct {
	Cursor *Cursor `ic:"cursor"`
}

// Cycle fields are candid nat (arbitrary precision), hence idl.Nat.
type CyclesMetricsSnapshot struct {
	TimestampNS                    uint64              `ic:"timestamp_ns"`
	CanisterID                     principal.Principal `ic:"canister_id"`
	Memory                         idl.Nat             `ic:"memory"`
	ComputeAllocation              idl.Nat             `ic:"compute_allocation"`
	IngressInduction               idl.Nat             `ic:"ingress_induction"`
	Instructions                   idl.Nat             `ic:"instructions"`
	RequestAndResponseTransmission idl.Nat             `ic:"request_and_response_transmission"`
	Uninstall                      idl.Nat             `ic:"uninstall"`
	HTTPOutcalls                   idl.Nat             `ic:"http_outcalls"`
	BurnedCycles                   idl.Nat             `ic:"burned_cycles"`
}

type listMetricsAfterOk struct {
	Snapshots  []CyclesMetricsSnapshot `ic:"snapshots"`
	NextCursor *Cursor                 `ic:"next_cursor"`
}

type listMetricsAfterResponse struct {
	Ok  *listMetricsAfterOk `ic:"Ok,variant"`
	Err *apiError           `ic:"Err,variant"`
}

// list_metrics_after is an update call by design: the canister refuses to
// expose metrics via query.
func (c *Client) ListMetricsAfter(ctx context.Context, cursor *Cursor) ([]CyclesMetricsSnapshot, *Cursor, error) {
	req := listMetricsAfterRequest{Cursor: cursor}
	var res listMetricsAfterResponse
	if err := c.agent.CallWithContext(ctx, c.cyclesMonitor, "list_metrics_after", []any{req}, []any{&res}); err != nil {
		return nil, nil, fmt.Errorf("call list_metrics_after: %w", err)
	}
	if res.Err != nil {
		return nil, nil, fmt.Errorf("cycles-monitor error %s: %s", res.Err.Code, res.Err.Message)
	}
	if res.Ok == nil {
		return nil, nil, fmt.Errorf("cycles-monitor returned neither Ok nor Err")
	}
	return res.Ok.Snapshots, res.Ok.NextCursor, nil
}

type CanisterUsage struct {
	CanisterID                     principal.Principal `ic:"canister_id"`
	Memory                         uint64              `ic:"memory"`
	MemoryBytes                    uint64              `ic:"memory_bytes"`
	ComputeAllocation              uint64              `ic:"compute_allocation"`
	ComputeAllocationPercent       uint64              `ic:"compute_allocation_percent"`
	IngressInduction               uint64              `ic:"ingress_induction"`
	IngressInductionBytesTotal     uint64              `ic:"ingress_induction_bytes_total"`
	Instructions                   uint64              `ic:"instructions"`
	ComputeTimeSecondsTotal        uint64              `ic:"compute_time_seconds_total"`
	RequestAndResponseTransmission uint64              `ic:"request_and_response_transmission"`
	TransmissionBytesTotal         uint64              `ic:"transmission_bytes_total"`
	Uninstall                      uint64              `ic:"uninstall"`
	UninstallsTotal                uint64              `ic:"uninstalls_total"`
	HTTPOutcalls                   uint64              `ic:"http_outcalls"`
	BurnedCycles                   uint64              `ic:"burned_cycles"`
}

type recordUsageRequest struct {
	Usages []CanisterUsage `ic:"usages"`
}

type recordUsageResponse struct {
	Ok  *struct{} `ic:"Ok,variant"`
	Err *apiError `ic:"Err,variant"`
}

// record_usage is authorized by caller principal: must match the backend's PUBLIC_KEY.
func (c *Client) RecordUsage(ctx context.Context, usages []CanisterUsage) error {
	req := recordUsageRequest{Usages: usages}
	var res recordUsageResponse
	if err := c.agent.CallWithContext(ctx, c.backend, "record_usage", []any{req}, []any{&res}); err != nil {
		return fmt.Errorf("call record_usage: %w", err)
	}
	if res.Err != nil {
		return fmt.Errorf("backend error %s: %s", res.Err.Code, res.Err.Message)
	}
	return nil
}
