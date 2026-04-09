# Project Management

Projects are resource containers within the hierarchy. They group
canisters and their associated approval policies and proposals.
Access to projects is gated through team membership:
`User -> Team -> Project -> Canister`.

## Data Model

### Project

```rust
pub struct Project {
    pub org_id: Uuid,
    pub name: String,
}
```

### Canister

```rust
pub struct Canister {
    pub principal: Principal,
}
```

A `Canister` record is a reference to an on-chain ICP canister, not
the canister itself.

### Approval Policy

```rust
pub struct ApprovalPolicy {
    pub policy_type: PolicyType,  // AutoApprove
}
```

Approval policies are keyed by `(project_id, OperationType)`.
Currently the only policy type is `AutoApprove`. Operation types:

| Operation               | Description                       |
| ----------------------- | --------------------------------- |
| `CreateCanister`        | Creating a new ICP canister       |
| `AddCanisterController` | Adding a controller to a canister |

### Data Storage

| Store                             | Type                                      | Purpose              |
| --------------------------------- | ----------------------------------------- | -------------------- |
| `projects`                        | `BTreeMap<Uuid, Project>`                 | Project records      |
| `team_project_index`              | `BTreeSet<(team_id, project_id)>`         | Team -> projects     |
| `project_team_index`              | `BTreeSet<(project_id, team_id)>`         | Project -> teams     |
| `organization_project_index`      | `BTreeSet<(org_id, project_id)>`          | Org -> projects      |
| `canisters`                       | `BTreeMap<Uuid, Canister>`                | Canister records     |
| `project_canister_index`          | `BTreeSet<(project_id, canister_id)>`     | Project -> canisters |
| `canister_project_index`          | `BTreeMap<canister_id, project_id>`       | Canister -> project  |
| `approval_policies`               | `BTreeMap<(project_id, op_type), Policy>` | Approval policies    |
| `project_operation_type_ap_index` | Index for policy lookups                  | Policy indexing      |

Memory IDs 3-4, 19-24, 27 in `memory_manager.rs`.

## Candid Interface

| Endpoint           | Type     | Description                         |
| ------------------ | -------- | ----------------------------------- |
| `list_my_projects` | `query`  | List projects across caller's teams |
| `create_project`   | `update` | Create a project in an org          |

### Candid Types

```candid
type Project = record {
  id : text;
  org_id : text;
  name : text;
};

type CreateProjectRequest = record {
  org_id : text;
  name : text;
};
```

### How `list_my_projects` Works

The query resolves projects through team membership:

1. Look up the caller's user ID by principal.
2. Get all team IDs the user belongs to (`user_team_index`).
3. For each team, get all project IDs (`team_project_index`).
4. Return the deduplicated set of projects.

This means a user only sees projects in teams they belong to, not
all projects in the org.

### How `create_project` Works

1. Validate the caller is a member of the target org.
2. Create the `Project` record.
3. Return the new project (with generated UUID).

Note: `create_project` does not assign the project to a team. The
project is linked to the org but has no team association until
explicitly added. The default project created during signup is
linked to the default team.

## Authorization

- `list_my_projects` -- implicit via team membership indexes. No
  explicit auth check needed beyond having a valid user ID.
- `create_project` -- requires org membership. Any org member can
  create projects.

## Frontend

- **Canister management** (`/projects/:projectId/canisters`) -- the
  main project view, showing canisters within a project. Uses the
  `ProjectLayout` wrapper.
- The sidebar/navigation shows projects grouped by organization.

State is managed via the Zustand store slice `project.ts` and
`canister.ts`.

## Known Gaps

- **New projects are invisible by default.** `create_project` links
  the project to an org but does not assign it to any team. Since
  access is team-based, the project is inaccessible until explicitly
  added to a team. There is no endpoint for this assignment yet.
- **No project update endpoint.** Projects cannot be renamed after
  creation.
- **No project deletion.** The `delete_project` endpoint does not
  exist. This blocks `delete_organization` since every org has at
  least one default project. Deletion would need to cascade to
  approval policies, proposals, and canister associations.
- **No project-team assignment API.** There is no endpoint to add or
  remove a project from a team after creation. See first gap above.
- **No project member list.** There is no way to see which users
  have access to a project (would need to resolve through teams).
- **Projects are org-scoped but team-accessed.** A project belongs to
  an org (via `org_id` and `organization_project_index`) but access
  is only through teams. There is no endpoint to list all projects in
  an org regardless of team membership.
