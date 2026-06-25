// Package backend wraps the goic-generated canister client with the agent
// setup and Ok/Err-variant-to-error conversion the CLI commands use.
package backend

import (
	"fmt"
	"net/url"

	"github.com/aviate-labs/agent-go"
	"github.com/aviate-labs/agent-go/candid/idl"
	"github.com/aviate-labs/agent-go/identity"
	"github.com/aviate-labs/agent-go/principal"

	canister "github.com/swiss-subnet/ssn-console/services/canister-clients/backend"
)

type Client struct {
	a *canister.BackendAgent
}

type Config struct {
	ICHost       string
	CanisterID   principal.Principal
	Identity     identity.Identity
	FetchRootKey bool // true for local replicas
}

func New(cfg Config) (*Client, error) {
	host, err := url.Parse(cfg.ICHost)
	if err != nil {
		return nil, fmt.Errorf("parse IC host: %w", err)
	}
	a, err := canister.NewBackendAgent(cfg.CanisterID, agent.Config{
		Identity:     cfg.Identity,
		ClientConfig: []agent.ClientOption{agent.WithHostURL(host)},
		FetchRootKey: cfg.FetchRootKey,
	})
	if err != nil {
		return nil, fmt.Errorf("new agent: %w", err)
	}
	return &Client{a: a}, nil
}

func (c *Client) Sender() principal.Principal { return c.a.Sender() }

// StaffPermissions is re-exported so commands don't import the generated
// package directly.
type StaffPermissions = canister.StaffPermissions

func statusValue(active bool) canister.UserStatus {
	s := canister.UserStatus{}
	if active {
		s.Active = new(idl.Null)
	} else {
		s.Inactive = new(idl.Null)
	}
	return s
}

// StatusLabel names the status a SetUserActive(active) call produces.
func StatusLabel(active bool) string { return StatusName(statusValue(active)) }

func apiErr(e *canister.ApiError) error {
	if e == nil {
		return nil
	}
	return fmt.Errorf("canister: %s", e.Message)
}

func StatusName(s canister.UserStatus) string {
	switch {
	case s.Active != nil:
		return "Active"
	case s.Inactive != nil:
		return "Inactive"
	default:
		return "Unknown"
	}
}

func (c *Client) ListUsers() ([]canister.UserProfile, error) {
	res, err := c.a.AdminListUserProfiles()
	if err != nil {
		return nil, err
	}
	if res.Err != nil {
		return nil, apiErr(res.Err)
	}
	return *res.Ok, nil
}

func (c *Client) SetUserActive(userID string, active bool) error {
	status := statusValue(active)
	res, err := c.a.AdminUpdateUserProfile(canister.UpdateUserProfileRequest{
		UserId: userID,
		Status: &status,
	})
	if err != nil {
		return err
	}
	return apiErr(res.Err)
}

func (c *Client) GrantStaff(userID string, perms canister.StaffPermissions) error {
	res, err := c.a.AdminGrantStaffPermissions(canister.GrantStaffPermissionsRequest{
		UserId:      userID,
		Permissions: perms,
	})
	if err != nil {
		return err
	}
	return apiErr(res.Err)
}

func (c *Client) RevokeStaff(userID string) error {
	res, err := c.a.AdminRevokeStaffPermissions(canister.RevokeStaffPermissionsRequest{UserId: userID})
	if err != nil {
		return err
	}
	return apiErr(res.Err)
}

func (c *Client) ListStaff() ([]canister.StaffMember, error) {
	res, err := c.a.AdminListStaff(canister.ListStaffRequest{})
	if err != nil {
		return nil, err
	}
	if res.Err != nil {
		return nil, apiErr(res.Err)
	}
	return *res.Ok, nil
}

func (c *Client) LinkPrincipal(userID string, p principal.Principal) error {
	res, err := c.a.AdminLinkPrincipalToUser(canister.AdminLinkPrincipalRequest{UserId: userID, Principal: p})
	if err != nil {
		return err
	}
	return apiErr(res.Err)
}

func (c *Client) UnlinkPrincipal(userID string, p principal.Principal) error {
	res, err := c.a.AdminUnlinkPrincipalFromUser(canister.AdminUnlinkPrincipalRequest{UserId: userID, Principal: p})
	if err != nil {
		return err
	}
	return apiErr(res.Err)
}

func (c *Client) ListLinkedPrincipals(userID string) ([]principal.Principal, error) {
	res, err := c.a.AdminListLinkedPrincipals(canister.AdminListLinkedPrincipalsRequest{UserId: userID})
	if err != nil {
		return nil, err
	}
	if res.Err != nil {
		return nil, apiErr(res.Err)
	}
	return res.Ok.Principals, nil
}
