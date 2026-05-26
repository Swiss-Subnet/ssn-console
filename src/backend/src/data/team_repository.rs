use super::{
    memory::{
        init_organization_team_index, init_organization_team_permissions_index,
        init_team_user_index, init_teams, init_user_team_index, OrganizationTeamIndexMemory,
        OrganizationTeamPermissionsIndexMemory, TeamMemory, TeamUserIndexMemory,
        UserTeamIndexMemory,
    },
    OrgId, OrgPermissions, Team, TeamId, UserId,
};
use canister_utils::{ApiError, ApiResult};
use std::cell::RefCell;

pub fn create_team(user_id: UserId, org_id: OrgId, team: Team) -> TeamId {
    create_team_with_permissions(user_id, org_id, team, OrgPermissions::ALL)
}

pub fn create_team_with_permissions(
    user_id: UserId,
    org_id: OrgId,
    team: Team,
    permissions: OrgPermissions,
) -> TeamId {
    let team_id = TeamId::new();

    mutate_state(|s| {
        s.teams.insert(team_id, team);
        s.team_user_index.insert((team_id, user_id));
        s.user_team_index.insert((user_id, team_id));
        s.organization_team_permissions_index
            .insert((org_id, team_id), permissions);
    });

    team_id
}

pub fn add_default_team(user_id: UserId, org_id: OrgId) -> TeamId {
    let team = Team {
        org_id,
        name: "Default Team".to_string(),
    };

    create_team(user_id, org_id, team)
}

pub fn get_team(team_id: TeamId) -> Option<Team> {
    with_state(|s| s.teams.get(&team_id))
}

pub fn update_team(team_id: TeamId, team: Team) -> ApiResult {
    mutate_state(|s| {
        if !s.teams.contains_key(&team_id) {
            return Err(ApiError::client_error(format!(
                "Team with id {team_id} does not exist."
            )));
        }
        s.teams.insert(team_id, team);
        Ok(())
    })
}

pub fn delete_team(team_id: TeamId, org_id: OrgId) -> ApiResult {
    mutate_state(|s| {
        if s.teams.remove(&team_id).is_none() {
            return Err(ApiError::client_error(format!(
                "Team with id {team_id} does not exist."
            )));
        }

        s.organization_team_permissions_index
            .remove(&(org_id, team_id));

        let team_users = s
            .team_user_index
            .range((team_id, UserId::MIN)..=(team_id, UserId::MAX))
            .collect::<Vec<_>>();

        for (tid, uid) in team_users {
            s.team_user_index.remove(&(tid, uid));
            s.user_team_index.remove(&(uid, tid));
        }

        Ok(())
    })
}

// Deletes all teams belonging to an org and their user links.
// Called as part of org deletion after the service layer confirms the
// org has no projects.
pub fn delete_org_teams(org_id: OrgId) {
    mutate_state(|s| {
        let org_team_permissions = s
            .organization_team_permissions_index
            .range((org_id, TeamId::MIN)..=(org_id, TeamId::MAX))
            .map(|entry| *entry.key())
            .collect::<Vec<_>>();

        for (oid, team_id) in org_team_permissions {
            s.organization_team_permissions_index
                .remove(&(oid, team_id));
            s.teams.remove(&team_id);

            let team_users = s
                .team_user_index
                .range((team_id, UserId::MIN)..=(team_id, UserId::MAX))
                .collect::<Vec<_>>();

            for (tid, uid) in team_users {
                s.team_user_index.remove(&(tid, uid));
                s.user_team_index.remove(&(uid, tid));
            }
        }
    });
}

pub fn is_user_in_team(user_id: UserId, team_id: TeamId) -> bool {
    with_state(|s| s.team_user_index.contains(&(team_id, user_id)))
}

// Overwrite the org permissions granted to `team_id` within `org_id`. No-op
// if the link is absent. Callers must check any invariants (e.g. ORG_ADMIN
// populated) before calling — on the IC a post-mutation error does not roll
// back state.
pub fn set_org_team_permissions(org_id: OrgId, team_id: TeamId, permissions: OrgPermissions) {
    mutate_state(|s| {
        if s.organization_team_permissions_index
            .get(&(org_id, team_id))
            .is_some()
        {
            s.organization_team_permissions_index
                .insert((org_id, team_id), permissions);
        }
    });
}

// Union the OrgPermissions of every team the user belongs to within `org_id`.
// Returns OrgPermissions::EMPTY if the user has no teams in the org.
pub fn aggregate_user_org_permissions(user_id: UserId, org_id: OrgId) -> OrgPermissions {
    with_state(|s| {
        let team_ids: Vec<TeamId> = s
            .user_team_index
            .range((user_id, TeamId::MIN)..=(user_id, TeamId::MAX))
            .map(|(_, team_id)| team_id)
            .collect();

        let mut perms = OrgPermissions::EMPTY;
        for team_id in team_ids {
            if let Some(p) = s
                .organization_team_permissions_index
                .get(&(org_id, team_id))
            {
                perms = perms.union(p);
            }
        }
        perms
    })
}

// Invariant predicate: would the org still have at least one team holding
// ORG_ADMIN with at least one member if `excluded_team_id` were removed?
// Used as a pre-mutation check on delete paths — on the IC, returning Err
// after a mutation does not roll back state, so this must be evaluated
// before any repository write that could break the invariant.
pub fn org_admin_is_populated_excluding_team(org_id: OrgId, excluded_team_id: TeamId) -> bool {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, TeamId::MIN)..=(org_id, TeamId::MAX))
            .any(|entry| {
                let (_, team_id) = *entry.key();
                if team_id == excluded_team_id {
                    return false;
                }
                entry.value().contains(OrgPermissions::ORG_ADMIN)
                    && s.team_user_index
                        .range((team_id, UserId::MIN)..=(team_id, UserId::MAX))
                        .next()
                        .is_some()
            })
    })
}

pub fn add_user_to_team(user_id: UserId, team_id: TeamId) {
    mutate_state(|s| {
        s.team_user_index.insert((team_id, user_id));
        s.user_team_index.insert((user_id, team_id));
    });
}

// No-op if the link is absent.
pub fn remove_user_from_team(user_id: UserId, team_id: TeamId) {
    mutate_state(|s| {
        s.team_user_index.remove(&(team_id, user_id));
        s.user_team_index.remove(&(user_id, team_id));
    });
}

// Invariant predicate: would the org still have at least one team holding
// ORG_ADMIN with at least one member if `user_id` were removed from
// `from_team_id`? Like `org_admin_is_populated_excluding_team`, this is a
// pre-mutation check — on the IC a post-mutation Err does not roll back the
// write. Unlike that helper, the team is not excluded; instead its membership
// is evaluated as if `user_id` had already left, so removing the sole member
// of the only ORG_ADMIN team is rejected.
pub fn org_admin_is_populated_excluding_team_member(
    org_id: OrgId,
    from_team_id: TeamId,
    user_id: UserId,
) -> bool {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, TeamId::MIN)..=(org_id, TeamId::MAX))
            .any(|entry| {
                let (_, team_id) = *entry.key();
                if !entry.value().contains(OrgPermissions::ORG_ADMIN) {
                    return false;
                }
                s.team_user_index
                    .range((team_id, UserId::MIN)..=(team_id, UserId::MAX))
                    .any(|(_, member_id)| !(team_id == from_team_id && member_id == user_id))
            })
    })
}

pub fn list_org_teams_with_permissions(org_id: OrgId) -> Vec<(TeamId, Team, OrgPermissions)> {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, TeamId::MIN)..=(org_id, TeamId::MAX))
            .filter_map(|entry| {
                let (_, team_id) = *entry.key();
                let perms = entry.value();
                s.teams.get(&team_id).map(|team| (team_id, team, perms))
            })
            .collect()
    })
}

pub fn has_at_least_n_org_teams(org_id: OrgId, n: usize) -> bool {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, TeamId::MIN)..=(org_id, TeamId::MAX))
            .take(n)
            .count()
            >= n
    })
}

pub fn list_team_user_ids(team_id: TeamId) -> Vec<UserId> {
    with_state(|s| {
        s.team_user_index
            .range((team_id, UserId::MIN)..=(team_id, UserId::MAX))
            .map(|(_, user_id)| user_id)
            .collect()
    })
}

pub fn list_user_team_ids(user_id: UserId) -> Vec<TeamId> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, TeamId::MIN)..=(user_id, TeamId::MAX))
            .map(|(_, team_id)| team_id)
            .collect()
    })
}

// All teams in `org_id` that `user_id` belongs to.
pub fn list_user_teams_in_org(user_id: UserId, org_id: OrgId) -> Vec<TeamId> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, TeamId::MIN)..=(user_id, TeamId::MAX))
            .filter_map(|(_, team_id)| {
                s.organization_team_permissions_index
                    .get(&(org_id, team_id))
                    .map(|_| team_id)
            })
            .collect()
    })
}

pub fn list_user_teams(user_id: UserId) -> Vec<(TeamId, Team)> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, TeamId::MIN)..=(user_id, TeamId::MAX))
            .filter_map(|(_, team_id)| s.teams.get(&team_id).map(|team| (team_id, team)))
            .collect()
    })
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![
            ("teams", s.teams.len()),
            ("team_user_index", s.team_user_index.len()),
            ("user_team_index", s.user_team_index.len()),
            ("organization_team_index", s.organization_team_index.len()),
            (
                "organization_team_permissions_index",
                s.organization_team_permissions_index.len(),
            ),
        ]
    })
}

struct TeamState {
    teams: TeamMemory,
    team_user_index: TeamUserIndexMemory,
    user_team_index: UserTeamIndexMemory,
    organization_team_index: OrganizationTeamIndexMemory, // TODO: remove after migration has run on all environments
    organization_team_permissions_index: OrganizationTeamPermissionsIndexMemory,
}

impl Default for TeamState {
    fn default() -> Self {
        Self {
            teams: init_teams(),
            team_user_index: init_team_user_index(),
            user_team_index: init_user_team_index(),
            organization_team_index: init_organization_team_index(),
            organization_team_permissions_index: init_organization_team_permissions_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<TeamState> = RefCell::new(TeamState::default());
}

pub fn migrate_org_team_permissions() {
    mutate_state(|s| {
        let entries: Vec<(OrgId, TeamId)> = s
            .organization_team_index
            .range((OrgId::MIN, TeamId::MIN)..=(OrgId::MAX, TeamId::MAX))
            .collect();

        for (org_id, team_id) in entries {
            s.organization_team_index.remove(&(org_id, team_id));
            if s.organization_team_permissions_index
                .get(&(org_id, team_id))
                .is_none()
            {
                s.organization_team_permissions_index
                    .insert((org_id, team_id), OrgPermissions::ALL);
            }
        }
    });
}

fn with_state<R>(f: impl FnOnce(&TeamState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut TeamState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
