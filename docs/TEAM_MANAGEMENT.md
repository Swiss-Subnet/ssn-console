# Team Management

Teams are the access control unit between organizations and projects.
A user accesses projects through team membership:
`User -> Team -> Project -> Canister`.

## Data Model

The `Team` struct stores `org_id` and `name`. Relationships are
maintained via BTree indexes in stable memory:

| Store                     | Type                           | Purpose      |
| ------------------------- | ------------------------------ | ------------ |
| `teams`                   | `BTreeMap<Uuid, Team>`         | Team records |
| `team_user_index`         | `BTreeSet<(team_id, user_id)>` | Team members |
| `user_team_index`         | `BTreeSet<(user_id, team_id)>` | Inverse      |
| `organization_team_index` | `BTreeSet<(org_id, team_id)>`  | Org -> teams |

Memory IDs are already allocated (15-18) in `memory_manager.rs`.

## What Exists Today

The `Team` struct stores `org_id` and `name`. On org creation, a
"Default Team" is auto-created with a default project inside it. On
org deletion, all org teams are cascade-deleted.

### Endpoints

| Endpoint           | Type     | Description                         |
| ------------------ | -------- | ----------------------------------- |
| `list_my_teams`    | `query`  | List caller's teams across all orgs |
| `list_org_teams`   | `query`  | List teams within an org            |
| `create_team`      | `update` | Create a team in an org             |
| `get_team`         | `query`  | Get a single team by ID             |
| `update_team`      | `update` | Rename a team                       |
| `delete_team`      | `update` | Delete a team                       |
| `add_user_to_team` | `update` | Add an org member to a team         |

### Validation and Guards

- Team name: non-empty, max 100 characters, trimmed.
- Max 50 teams per organization.
- Cannot delete the last team in an org.
- Cannot delete a team that still has projects.

## Authorization Model

All team operations require the caller to be a member of the team's
parent organization. There are no team-level roles (admin/member) --
all org members have equal permissions over teams within that org.

For read operations (list, get), org membership is sufficient.
For mutations (create, update, delete, add user), org membership is
sufficient (no team membership required -- you manage teams at the
org level).

### Known Gaps

- **`add_user_to_team` is unusable in practice.** Both the caller and
  the target user must be in the team's org, but there is no org
  invitation API yet. The only org member is the creator.
- **No `list_team_members` endpoint.** There is no way to see who is
  in a team. The indexes exist (`team_user_index`) but no endpoint
  exposes them.
- **No `remove_user_from_team` endpoint.** Once a user is added to a
  team, there is no way to remove them.
- **No team members UI.** The team settings page has rename and
  delete but no member management section.

## Frontend

Team management UI will live under the org settings area:

- `/organizations/:orgId/teams` -- list teams in org
- `/organizations/:orgId/teams/new` -- create team form
- `/organizations/:orgId/teams/:teamId` -- team settings (rename,
  delete, manage members)
