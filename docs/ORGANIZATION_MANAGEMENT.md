# Organization Management

## Current Design

Organizations are the top-level grouping entity. The hierarchy is:

```
Organization
  +-- Team (access control unit)
  |     +-- Project
  |           +-- Canister (ICP canister principal)
  |           +-- Approval Policies
  |           +-- Proposals
  +-- User (many-to-many via indexes)
```

### Access Model

Access control is **team-based**, not role-based:

- **Organizations** scope users and teams. Membership is checked via
  `assert_user_in_org(user_id, org_id)`.
- **Teams** gate access to projects. A user can only access projects
  belonging to teams they are a member of. Checked via
  `assert_any_team_has_project(user_id, team_ids, project_id)`.
- There are **no roles** (admin/member). All members of an org/team
  have equal permissions.

### Data Storage

All data lives in IC stable memory using `BTreeMap` and `BTreeSet`:

| Store | Type | Purpose |
|-------|------|---------|
| `organizations` | `BTreeMap<Uuid, Organization>` | Org records (only `name` field) |
| `organization_user_index` | `BTreeSet<(org_id, user_id)>` | Org members |
| `user_organization_index` | `BTreeSet<(user_id, org_id)>` | Inverse (user -> orgs) |
| `organization_team_index` | `BTreeSet<(org_id, team_id)>` | Org teams |
| `organization_project_index` | `BTreeSet<(org_id, project_id)>` | Org projects |
| `team_user_index` | `BTreeSet<(team_id, user_id)>` | Team members |
| `user_team_index` | `BTreeSet<(user_id, team_id)>` | Inverse (user -> teams) |
| `team_project_index` | `BTreeSet<(team_id, project_id)>` | Team projects |
| `project_team_index` | `BTreeSet<(project_id, team_id)>` | Inverse |
| `project_canister_index` | `BTreeSet<(project_id, canister_id)>` | Project canisters |
| `canister_project_index` | `BTreeMap<canister_id, project_id>` | Inverse (canister -> project) |

### Where Canisters Fit

Canisters belong to **projects**, not directly to organizations. A
`Canister` record stores an ICP canister `principal: Principal` -- it
is a reference to an on-chain canister, not the canister itself.

Access to canisters is gated indirectly:
`User -> Team -> Project -> Canister`

There is no direct org-to-canister relationship. To find all canisters
in an org, you go: org -> projects (via `organization_project_index`)
-> canisters (via `project_canister_index`).

### What Exists Today

- A "Default Organization" is auto-created on user signup, along with
  a default team, default project, and default approval policies.
- `list_my_organizations` -- query endpoint to list a user's orgs.
- No other org management endpoints exist.

## Planned Features

### Phase 1: Basic CRUD

- **Create organization** -- let users create additional orgs. Should
  auto-create a default team + project (matching signup flow).
- **Update organization** -- edit org name.
- **Get organization** -- fetch single org details for a settings page.

### Phase 2: Delete Organization

Deleting an org requires cascade cleanup across all related data:

```
delete_organization(org_id)
  |
  +-- For each project in org (via organization_project_index):
  |     +-- Delete canister records (via project_canister_index)
  |     +-- Delete approval policies
  |     +-- Delete proposals
  |     +-- Remove project-team links
  |     +-- Remove org-project link
  |     +-- Delete project record
  |
  +-- For each team in org (via organization_team_index):
  |     +-- Remove team-user links
  |     +-- Remove org-team link
  |     +-- Delete team record
  |
  +-- Remove all org-user links
  +-- Delete org record
```

Guards:
- Prevent deleting a user's last org.
- **Require the org to be empty** -- org must have no projects (and
  therefore no canisters) before it can be deleted. Users must move
  or delete projects first. This avoids the cascade problem entirely
  and sidesteps the question of what to do with on-chain canisters.

Cleanup on delete (when org is empty):
- Remove all org-user links
- Remove all org-team links, delete team records
- Delete org record

### Phase 3: Team Management

Teams are the access control primitive, but there are currently no
management endpoints:

- Create/delete teams within an org
- Add/remove users from teams
- Assign/unassign projects to teams

### Future Considerations

- Org metadata (description, logo, settings)
- Invite flow (invite users by principal/email)
- Transfer org ownership (track `creator_id` on org)
