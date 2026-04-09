# Overview

SSN Console is a management console for ICP (Internet Computer)
canisters. It provides a web interface and backend canister for
organizing users, teams, projects, and canisters with team-based
access control.

## Architecture

The system consists of three main components:

```
+------------------+     +---------------------+     +-------------------+
| Frontend         |     | Backend Canister     |     | Offchain Service  |
| React / Vite     |---->| Rust / IC           |     | Bun / ElysiaJS    |
| TailwindCSS      |     | Stable Memory       |     | Email, JWT verify |
+------------------+     +---------------------+     +-------------------+
```

- **Frontend** -- React 19 SPA with TypeScript, Vite, TailwindCSS,
  React Router, and Zustand for state management. Communicates with
  the backend canister via the generated Candid API.
- **Backend canister** -- Rust canister deployed on ICP. Stores all
  application state in stable memory using `BTreeMap` and `BTreeSet`
  with CBOR serialization. Exposes query and update endpoints via
  Candid.
- **Offchain service** -- Bun/ElysiaJS service handling operations
  that cannot run on-chain (email sending, JWT-based email
  verification). Deployed as a standalone binary in a container.

## Entity Hierarchy

```
User (identified by ICP Principal)
  +-- Organization (top-level grouping)
        +-- Team (access control unit)
        |     +-- Project (resource container)
        |           +-- Canister (ICP canister reference)
        |           +-- Approval Policy (governs operations)
        |           +-- Proposal (pending operations)
        +-- User (many-to-many via indexes)
```

Access to resources flows through the hierarchy:
`User -> Organization -> Team -> Project -> Canister`

A user can only access canisters in projects that belong to teams
they are a member of. There are no org/team roles (admin/member) --
all members have equal permissions within their org. Admin status is
a separate concept: it is computed at query time based on whether the
caller's principal matches the canister controller.

## Signup Flow

When a user calls `create_my_user_profile`, the following defaults
are created automatically:

1. A `UserProfile` (status: Inactive, no email)
2. A "Default Organization"
3. A "Default Team" within that organization
4. A "Default Project" within that team
5. Two `ApprovalPolicy` records on the project (AutoApprove for
   `CreateCanister` and `AddCanisterController`)

This gives every new user a working setup out of the box.

## Data Storage

All data is stored in IC stable memory. Each entity and index gets
a dedicated memory ID managed by `memory_manager.rs`. Entities are
serialized with CBOR. Relationships between entities are maintained
via `BTreeSet` indexes (composite keys like `(org_id, user_id)`).

See the entity-specific docs for the full index listing.

## Frontend Routes

| Route                                          | Page                  |
| ---------------------------------------------- | --------------------- |
| `/`                                            | Home                  |
| `/organizations/new`                           | Create organization   |
| `/organizations/:orgId/settings`               | Organization settings |
| `/organizations/:orgId/teams`                  | Team list             |
| `/organizations/:orgId/teams/new`              | Create team           |
| `/organizations/:orgId/teams/:teamId/settings` | Team settings         |
| `/projects/:projectId/canisters`               | Canister management   |
| `/admin`                                       | Admin panel           |
| `/terms-and-conditions`                        | T&C agreement         |
| `/verify`                                      | Email verification    |

## Related Documentation

- [USER_MANAGEMENT.md](USER_MANAGEMENT.md) -- user profiles, auth,
  email verification.
- [ORGANIZATION_MANAGEMENT.md](ORGANIZATION_MANAGEMENT.md) -- org
  CRUD, membership, access model.
- [TEAM_MANAGEMENT.md](TEAM_MANAGEMENT.md) -- team CRUD, membership,
  authorization.
- [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md) -- projects,
  canisters, approval policies.
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) -- deployment, server setup,
  containers.
