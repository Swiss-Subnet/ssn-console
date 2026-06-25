package main

import (
	"fmt"
	"net/url"

	"github.com/aviate-labs/agent-go"
	"github.com/aviate-labs/agent-go/certification"
	"github.com/aviate-labs/agent-go/identity"
	"github.com/aviate-labs/agent-go/principal"

	"github.com/swiss-subnet/ssn-console/services/canister-clients/history"
	"github.com/swiss-subnet/ssn-console/tools/ssn-admin/internal/backend"
	"github.com/swiss-subnet/ssn-console/tools/ssn-admin/internal/config"
)

// subnetCmd dispatches `ssn-admin subnet <sub>`.
func subnetCmd(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("subnet: missing subcommand (show-ranges|sync-ranges)")
	}
	switch args[0] {
	case "show-ranges":
		return subnetShowRanges()
	case "sync-ranges":
		return subnetSyncRanges()
	default:
		return fmt.Errorf("subnet: unknown subcommand %q", args[0])
	}
}

// resolveSubnetRanges reads the live, certified canister-id ranges of the
// subnet the canister-history canister lives on. This is ground truth from the
// state tree. A canister cannot read its own subnet ranges, so an external
// agent fetches them. The read needs no authority, so identity is anonymous.
func resolveSubnetRanges(cfg *config.Config) (principal.Principal, certification.CanisterRanges, error) {
	target, err := principal.Decode(cfg.CanisterHistoryCanister)
	if err != nil {
		return principal.Principal{}, nil, fmt.Errorf("invalid CANISTER_ID_CANISTER_HISTORY %q: %w", cfg.CanisterHistoryCanister, err)
	}

	id, err := backend.LoadIdentityOptional(cfg.IdentityPEM, cfg.ICHost)
	if err != nil {
		return principal.Principal{}, nil, err
	}
	a, err := newAgent(cfg, id)
	if err != nil {
		return principal.Principal{}, nil, err
	}

	subnets, err := a.GetSubnetsInfo()
	if err != nil {
		return principal.Principal{}, nil, fmt.Errorf("read subnet state: %w", err)
	}
	for _, s := range subnets {
		if s.CanisterRanges.InRange(target) {
			return s.SubnetID, s.CanisterRanges, nil
		}
	}
	return principal.Principal{}, nil, fmt.Errorf("no subnet found containing canister %s", target.Encode())
}

func subnetShowRanges() error {
	cfg, err := loadSubnetConfig()
	if err != nil {
		return err
	}
	subnetID, ranges, err := resolveSubnetRanges(cfg)
	if err != nil {
		return err
	}
	fmt.Printf("subnet %s\n", subnetID.Encode())
	for _, r := range ranges {
		fmt.Printf("  %s  %s\n", r.From.Encode(), r.To.Encode())
	}
	return nil
}

// subnetSyncRanges reads the certified ranges (ground truth) and pushes them
// into canister-history via update_subnet_canister_ranges, correcting any
// drift between the stored config and reality. The write is controller-gated,
// so it requires a real identity (LoadIdentity refuses anonymous on mainnet).
func subnetSyncRanges() error {
	cfg, err := loadSubnetConfig()
	if err != nil {
		return err
	}
	subnetID, ranges, err := resolveSubnetRanges(cfg)
	if err != nil {
		return err
	}

	target, err := principal.Decode(cfg.CanisterHistoryCanister)
	if err != nil {
		return fmt.Errorf("invalid CANISTER_ID_CANISTER_HISTORY %q: %w", cfg.CanisterHistoryCanister, err)
	}
	id, err := backend.LoadIdentity(cfg.IdentityPEM, cfg.ICHost)
	if err != nil {
		return err
	}
	ch, err := history.NewCanisterHistoryAgent(target, agentConfig(cfg, id))
	if err != nil {
		return fmt.Errorf("new canister-history agent: %w", err)
	}

	var req history.UpdateSubnetCanisterRangesRequest
	for _, r := range ranges {
		req.CanisterRanges = append(req.CanisterRanges, struct {
			Field0 principal.Principal `ic:"0,tuple" json:"0"`
			Field1 principal.Principal `ic:"1,tuple" json:"1"`
		}{Field0: r.From, Field1: r.To})
	}

	if _, err := ch.UpdateSubnetCanisterRanges(req); err != nil {
		return fmt.Errorf("update_subnet_canister_ranges: %w", err)
	}
	fmt.Printf("synced %d range(s) for subnet %s to canister-history %s\n", len(ranges), subnetID.Encode(), target.Encode())
	return nil
}

func loadSubnetConfig() (*config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	if cfg.CanisterHistoryCanister == "" {
		return nil, fmt.Errorf("CANISTER_ID_CANISTER_HISTORY is required for subnet commands")
	}
	return cfg, nil
}

func agentConfig(cfg *config.Config, id identity.Identity) agent.Config {
	host, _ := url.Parse(cfg.ICHost)
	return agent.Config{
		Identity:     id,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey(),
	}
}

func newAgent(cfg *config.Config, id identity.Identity) (*agent.Agent, error) {
	if _, err := url.Parse(cfg.ICHost); err != nil {
		return nil, fmt.Errorf("parse IC host: %w", err)
	}
	a, err := agent.New(agentConfig(cfg, id))
	if err != nil {
		return nil, fmt.Errorf("new agent: %w", err)
	}
	return a, nil
}
