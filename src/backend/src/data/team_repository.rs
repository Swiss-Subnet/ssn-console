use super::{
    memory::{
        init_organization_team_index, init_organization_team_permissions_index,
        init_team_user_index, init_teams, init_user_team_index, OrganizationTeamIndexMemory,
        OrganizationTeamPermissionsIndexMemory, TeamMemory, TeamUserIndexMemory,
        UserTeamIndexMemory,
    },
    OrgPermissions, Team,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

pub fn create_team(user_id: Uuid, org_id: Uuid, team: Team) -> Uuid {
    create_team_with_permissions(user_id, org_id, team, OrgPermissions::ALL)
}

pub fn create_team_with_permissions(
    user_id: Uuid,
    org_id: Uuid,
    team: Team,
    permissions: OrgPermissions,
) -> Uuid {
    let team_id = Uuid::new();

    mutate_state(|s| {
        s.teams.insert(team_id, team);
        s.team_user_index.insert((team_id, user_id));
        s.user_team_index.insert((user_id, team_id));
        s.organization_team_permissions_index
            .insert((org_id, team_id), permissions);
    });

    team_id
}

pub fn add_default_team(user_id: Uuid, org_id: Uuid) -> Uuid {
    let team = Team {
        org_id,
        name: "Default Team".to_string(),
    };

    create_team(user_id, org_id, team)
}

pub fn get_team(team_id: Uuid) -> Option<Team> {
    with_state(|s| s.teams.get(&team_id))
}

pub fn update_team(team_id: Uuid, team: Team) -> ApiResult {
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

pub fn delete_team(team_id: Uuid, org_id: Uuid) -> ApiResult {
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
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
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
pub fn delete_org_teams(org_id: Uuid) {
    mutate_state(|s| {
        let org_team_permissions = s
            .organization_team_permissions_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .map(|entry| *entry.key())
            .collect::<Vec<_>>();

        for (oid, team_id) in org_team_permissions {
            s.organization_team_permissions_index
                .remove(&(oid, team_id));
            s.teams.remove(&team_id);

            let team_users = s
                .team_user_index
                .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
                .collect::<Vec<_>>();

            for (tid, uid) in team_users {
                s.team_user_index.remove(&(tid, uid));
                s.user_team_index.remove(&(uid, tid));
            }
        }
    });
}

pub fn is_user_in_team(user_id: Uuid, team_id: Uuid) -> bool {
    with_state(|s| s.team_user_index.contains(&(team_id, user_id)))
}

#[allow(dead_code)]
pub fn get_org_team_permissions(org_id: Uuid, team_id: Uuid) -> Option<OrgPermissions> {
    with_state(|s| {
        s.organization_team_permissions_index
            .get(&(org_id, team_id))
    })
}

// Union the OrgPermissions of every team the user belongs to within `org_id`.
// Returns OrgPermissions::EMPTY if the user has no teams in the org.
pub fn aggregate_user_org_permissions(user_id: Uuid, org_id: Uuid) -> OrgPermissions {
    with_state(|s| {
        let team_ids: Vec<Uuid> = s
            .user_team_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
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
pub fn org_admin_is_populated_excluding_team(org_id: Uuid, excluded_team_id: Uuid) -> bool {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .any(|entry| {
                let (_, team_id) = *entry.key();
                if team_id == excluded_team_id {
                    return false;
                }
                entry.value().contains(OrgPermissions::ORG_ADMIN)
                    && s.team_user_index
                        .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
                        .next()
                        .is_some()
            })
    })
}

pub fn add_user_to_team(user_id: Uuid, team_id: Uuid) {
    mutate_state(|s| {
        s.team_user_index.insert((team_id, user_id));
        s.user_team_index.insert((user_id, team_id));
    });
}

pub fn list_org_teams(org_id: Uuid) -> Vec<(Uuid, Team)> {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter_map(|entry| {
                let (_, team_id) = *entry.key();
                s.teams.get(&team_id).map(|team| (team_id, team))
            })
            .collect()
    })
}

#[allow(dead_code)]
pub fn list_org_teams_with_permissions(org_id: Uuid) -> Vec<(Uuid, Team, OrgPermissions)> {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter_map(|entry| {
                let (_, team_id) = *entry.key();
                let perms = entry.value();
                s.teams.get(&team_id).map(|team| (team_id, team, perms))
            })
            .collect()
    })
}

pub fn has_at_least_n_org_teams(org_id: Uuid, n: usize) -> bool {
    with_state(|s| {
        s.organization_team_permissions_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .take(n)
            .count()
            >= n
    })
}

pub fn list_team_user_ids(team_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.team_user_index
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
            .map(|(_, user_id)| user_id)
            .collect()
    })
}

pub fn list_user_team_ids(user_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .map(|(_, team_id)| team_id)
            .collect()
    })
}

// All teams in `org_id` that `user_id` belongs to.
pub fn list_user_teams_in_org(user_id: Uuid, org_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .filter_map(|(_, team_id)| {
                s.organization_team_permissions_index
                    .get(&(org_id, team_id))
                    .map(|_| team_id)
            })
            .collect()
    })
}

pub fn list_user_teams(user_id: Uuid) -> Vec<(Uuid, Team)> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .filter_map(|(_, team_id)| s.teams.get(&team_id).map(|team| (team_id, team)))
            .collect()
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
        let entries: Vec<(Uuid, Uuid)> = s
            .organization_team_index
            .range((Uuid::MIN, Uuid::MIN)..=(Uuid::MAX, Uuid::MAX))
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
