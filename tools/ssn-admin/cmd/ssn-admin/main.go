// ssn-admin is a CLI for the backend canister's admin operations (user
// activation, staff permissions, principal linking). It authenticates with an
// Ed25519 identity (ADMIN_IDENTITY_PEM, or the RFC 8032 test vector locally)
// and calls the canister via the goic-generated typed client.
package main

import (
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/aviate-labs/agent-go/principal"

	"github.com/swiss-subnet/ssn-console/tools/ssn-admin/internal/backend"
	"github.com/swiss-subnet/ssn-console/tools/ssn-admin/internal/config"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) < 1 {
		usage()
		return fmt.Errorf("missing command")
	}
	group, rest := args[0], args[1:]
	switch group {
	case "user":
		return userCmd(rest)
	case "staff":
		return staffCmd(rest)
	case "principal":
		return principalCmd(rest)
	case "subnet":
		return subnetCmd(rest)
	case "-h", "--help", "help":
		usage()
		return nil
	default:
		usage()
		return fmt.Errorf("unknown command %q", group)
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `usage: ssn-admin <command>

  user list
  user activate <user-id>
  user deactivate <user-id>

  staff list
  staff grant <user-id> [--read-all-orgs] [--write-billing] [--manage-users] [--read-metrics]
  staff revoke <user-id>

  principal list <user-id>
  principal link <user-id> <principal>
  principal unlink <user-id> <principal>

  subnet show-ranges

env: CANISTER_ID_BACKEND (required), IC_HOST (default http://127.0.0.1:4943),
     ADMIN_IDENTITY_PEM (required against non-local IC_HOST),
     CANISTER_ID_CANISTER_HISTORY (required for subnet commands)
`)
}

func newClient() (*backend.Client, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	id, err := backend.LoadIdentity(cfg.IdentityPEM, cfg.ICHost)
	if err != nil {
		return nil, err
	}
	canisterID, err := principal.Decode(cfg.BackendCanister)
	if err != nil {
		return nil, fmt.Errorf("invalid CANISTER_ID_BACKEND %q: %w", cfg.BackendCanister, err)
	}
	return backend.New(backend.Config{
		ICHost:       cfg.ICHost,
		CanisterID:   canisterID,
		Identity:     id,
		FetchRootKey: cfg.FetchRootKey(),
	})
}

func userCmd(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("user: missing subcommand (list|activate|deactivate)")
	}
	c, err := newClient()
	if err != nil {
		return err
	}
	switch args[0] {
	case "list":
		users, err := c.ListUsers()
		if err != nil {
			return err
		}
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		_, _ = fmt.Fprintln(w, "ID\tEMAIL\tVERIFIED\tSTATUS\tADMIN")
		for _, u := range users {
			email := "-"
			if u.Email != nil {
				email = *u.Email
			}
			_, _ = fmt.Fprintf(w, "%s\t%s\t%t\t%s\t%t\n", u.Id, email, u.EmailVerified, backend.StatusName(u.Status), u.IsAdmin)
		}
		return w.Flush()
	case "activate", "deactivate":
		if len(args) < 2 {
			return fmt.Errorf("user %s: missing <user-id>", args[0])
		}
		active := args[0] == "activate"
		if err := c.SetUserActive(args[1], active); err != nil {
			return err
		}
		fmt.Printf("user %s set %s\n", args[1], backend.StatusLabel(active))
		return nil
	default:
		return fmt.Errorf("user: unknown subcommand %q", args[0])
	}
}

func staffCmd(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("staff: missing subcommand (list|grant|revoke)")
	}
	c, err := newClient()
	if err != nil {
		return err
	}
	switch args[0] {
	case "list":
		staff, err := c.ListStaff()
		if err != nil {
			return err
		}
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		_, _ = fmt.Fprintln(w, "ID\tEMAIL\tORGS\tBILLING\tUSERS\tMETRICS")
		for _, s := range staff {
			email := "-"
			if s.Email != nil {
				email = *s.Email
			}
			p := s.Permissions
			_, _ = fmt.Fprintf(w, "%s\t%s\t%t\t%t\t%t\t%t\n", s.UserId, email, p.ReadAllOrgs, p.WriteBilling, p.ManageUsers, p.ReadMetrics)
		}
		return w.Flush()
	case "grant":
		if len(args) < 2 {
			return fmt.Errorf("staff grant: missing <user-id>")
		}
		userID := args[1]
		perms := parsePermFlags(args[2:])
		if err := c.GrantStaff(userID, perms); err != nil {
			return err
		}
		fmt.Printf("granted staff to %s\n", userID)
		return nil
	case "revoke":
		if len(args) < 2 {
			return fmt.Errorf("staff revoke: missing <user-id>")
		}
		if err := c.RevokeStaff(args[1]); err != nil {
			return err
		}
		fmt.Printf("revoked staff from %s\n", args[1])
		return nil
	default:
		return fmt.Errorf("staff: unknown subcommand %q", args[0])
	}
}

func principalCmd(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("principal: missing subcommand (list|link|unlink)")
	}
	c, err := newClient()
	if err != nil {
		return err
	}
	switch args[0] {
	case "list":
		if len(args) < 2 {
			return fmt.Errorf("principal list: missing <user-id>")
		}
		ps, err := c.ListLinkedPrincipals(args[1])
		if err != nil {
			return err
		}
		for _, p := range ps {
			fmt.Println(p.Encode())
		}
		return nil
	case "link", "unlink":
		if len(args) < 3 {
			return fmt.Errorf("principal %s: missing <user-id> <principal>", args[0])
		}
		p, err := principal.Decode(args[2])
		if err != nil {
			return fmt.Errorf("invalid principal %q: %w", args[2], err)
		}
		if args[0] == "link" {
			err = c.LinkPrincipal(args[1], p)
		} else {
			err = c.UnlinkPrincipal(args[1], p)
		}
		if err != nil {
			return err
		}
		fmt.Printf("%sed %s %s %s\n", args[0], p.Encode(), prep(args[0]), args[1])
		return nil
	default:
		return fmt.Errorf("principal: unknown subcommand %q", args[0])
	}
}

func parsePermFlags(args []string) backend.StaffPermissions {
	var p backend.StaffPermissions
	for _, a := range args {
		switch a {
		case "--read-all-orgs":
			p.ReadAllOrgs = true
		case "--write-billing":
			p.WriteBilling = true
		case "--manage-users":
			p.ManageUsers = true
		case "--read-metrics":
			p.ReadMetrics = true
		}
	}
	return p
}

func prep(verb string) string {
	if verb == "link" {
		return "to"
	}
	return "from"
}
