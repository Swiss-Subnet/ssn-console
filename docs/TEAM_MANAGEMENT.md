# Team Management

Teams are the access control unit between organizations and projects.
A user accesses projects through team membership:
`User -> Team -> Project -> Canister`.

## Data Model

The `Team` struct stores `org_id` and `name`. Relationships are
maintained via BTree indexes in stable memory:

| Store                      | Type                              | Purpose              |
| -------------------------- | --------------------------------- | -------------------- |
| `teams`                    | `BTreeMap<Uuid, Team>`            | Team records         |
| `team_user_index`          | `BTreeSet<(team_id, user_id)>`    | Team members         |
| `user_team_index`          | `BTreeSet<(user_id, team_id)>`    | Inverse              |
| `organization_team_index`  | `BTreeSet<(org_id, team_id)>`     | Org -> teams         |

Memory IDs are already allocated (15-18) in `memory_manager.rs`.

## What Exists Today

- `Team` model with `name` field only.
- Repository: `add_default_team`, `delete_org_teams`,
  `list_user_teams`, `list_user_team_ids`.
- Service/controller: `list_my_teams` query endpoint.
- On org creation, a "Default Team" is auto-created with a default
  project inside it.
- On org deletion, all org teams are cascade-deleted.

## Planned Changes

### Update Data Model

Add `org_id: Uuid` to the `Team` struct so we can look up a team's
org without scanning the `organization_team_index`.

### Create Team

Endpoint: `create_team(CreateTeamRequest { org_id, name })`

- Caller must be authenticated and a member of the org.
- Validate name (non-empty, max 100 chars).
- Create team record, add caller as member, add org-team link.
- Returns the new team.

### View Organisation Teams

Endpoint: `list_org_teams(ListOrgTeamsRequest { org_id })`

- Caller must be a member of the org.
- Returns all teams in the org (via `organization_team_index`).

The existing `list_my_teams` endpoint returns teams across all orgs
for the caller. This new endpoint scopes to a single org.

### Update Team Details

Endpoint: `update_team(UpdateTeamRequest { team_id, name })`

- Caller must be a member of the team's org.
- Validate name (same rules as create).
- Update the team record.

### Delete Team

Endpoint: `delete_team(DeleteTeamRequest { team_id })`

- Caller must be a member of the team's org.
- Guard: cannot delete the last team in an org.
- Guard: team must have no projects (same pattern as org deletion
  requiring no projects).
- Cleanup: remove team-user links, org-team link, team record.

### Add User to Team

Endpoint: `add_user_to_team(AddUserToTeamRequest { team_id, user_id })`

- Caller must be a member of the team's org.
- Target user must also be a member of the org.
- Adds user-team and team-user index entries.

### Create Default Team on Sign-up

This already works -- `add_default_team` is called during org
creation, which happens on signup. No changes needed unless the
default team needs different behavior.

## Authorization Model

All team operations require the caller to be a member of the team's
parent organization. There are no team-level roles (admin/member) --
all org members have equal permissions over teams within that org.

For read operations (list, get), org membership is sufficient.
For mutations (create, update, delete, add user), org membership is
sufficient (no team membership required -- you manage teams at the
org level).

## Frontend

Team management UI will live under the org settings area:

- `/organizations/:orgId/teams` -- list teams in org
- `/organizations/:orgId/teams/new` -- create team form
- `/organizations/:orgId/teams/:teamId` -- team settings (rename,
  delete, manage members)
