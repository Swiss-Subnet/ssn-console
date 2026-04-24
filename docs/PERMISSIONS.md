# Permissions

How access control works in the SSN console.

## Model

```
User -- is member of ---> Team -- attached to ---> Project
              |                  |
              |                  -- (team, project) pair has ProjectPermissions
              ------------------- Team has OrgPermissions
```

Three independent relations:

- **User <-> Team** -- membership, one row per pair.
- **Team -> OrgPermissions** -- one row per team, scoped to its org.
- **(Team, Project) -> ProjectPermissions** -- one row per pair.

Users never hold permissions directly. A user's effective permissions are the
**union** of their teams' permissions: at the org level across all their
teams, at the project level across all their teams that are attached to that
project. Aggregation happens at gate-check time (see
[`team_repository.rs`](../src/backend/src/data/team_repository.rs) and
[`project_repository.rs`](../src/backend/src/data/project_repository.rs)).

Project permissions are scoped per `(team, project)`. Changing team X's
permissions on project A does **not** affect team X on project B.

## OrgPermissions

Held by a team. Defined in
[`permissions.rs`](../src/backend/src/data/model/permissions.rs).

| Flag            | Grants                                        |
| --------------- | --------------------------------------------- |
| `orgAdmin`      | Full admin over the organization.             |
| `memberManage`  | Invite, add, and remove organization members. |
| `teamManage`    | Create, rename, and delete teams.             |
| `projectCreate` | Create new projects in the organization.      |
| `billingManage` | View and change billing settings.             |

## ProjectPermissions

Held by a `(team, project)` pair. Defined in
[`permissions.rs`](../src/backend/src/data/model/permissions.rs).

| Flag                   | Grants                                      |
| ---------------------- | ------------------------------------------- |
| `projectAdmin`         | Full admin over the project.                |
| `projectSettings`      | Rename the project and change its settings. |
| `canisterManage`       | Create and remove canisters.                |
| `canisterOperate`      | Start, stop, and install canisters.         |
| `canisterRead`         | View canister status and history.           |
| `proposalCreate`       | Create canister operation proposals.        |
| `proposalApprove`      | Approve canister operation proposals.       |
| `approvalPolicyManage` | Change the approval policy.                 |

## No implications

Flags do **not** cascade. `orgAdmin` does not implicitly grant
`memberManage`, `teamManage`, etc.; `projectAdmin` does not implicitly
grant the other project flags. Gate checks are plain `contains(needed)`
bit checks. If you want a team to be able to do everything at the org
level, set every flag.

## UI edit locations

| What you want to change                | Edit where                                      |
| -------------------------------------- | ----------------------------------------------- |
| Members of a team (user <-> team)      | Team settings -> Members card                   |
| A team's `OrgPermissions`              | Team settings -> Organization Permissions card  |
| Which teams are attached to a project  | Project settings -> Teams card                  |
| A `(team, project)` pair's permissions | Project settings -> per-team permissions editor |

## Bootstrapping

On org creation, a "Default Team" is created, the creator is added as its
sole member, and the team is granted `OrgPermissions::ALL`. See
[`organization_service.rs`](../src/backend/src/service/organization_service.rs).

On project creation, each of the creator's teams that should have access
is linked to the new project with `ProjectPermissions::ALL`. See
[`project_service.rs`](../src/backend/src/service/project_service.rs).

## Invariant: last-admin protection

Every organization must retain at least one team with `orgAdmin` and at
least one member. Operations that would violate this (removing the last
admin team, removing the last member of the last admin team, clearing
`orgAdmin` on the last admin team) are rejected pre-mutation. See
[`access_control_service.rs`](../src/backend/src/service/access_control_service.rs).

Projects have no equivalent invariant -- a project can end up with no
attached team, which locks out non-`orgAdmin` org members from it.
