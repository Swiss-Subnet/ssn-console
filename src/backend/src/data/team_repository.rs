use super::{
    memory::{
        init_organization_team_index, init_team_user_index, init_teams, init_user_team_index,
        OrganizationTeamIndexMemory, TeamMemory, TeamUserIndexMemory, UserTeamIndexMemory,
    },
    Team,
};
use canister_utils::Uuid;
use std::cell::RefCell;

pub fn add_default_team(user_id: Uuid, org_id: Uuid) -> Uuid {
    let team_id = Uuid::new();
    let team = Team {
        name: "Default Team".to_string(),
    };

    mutate_state(|s| {
        s.teams.insert(team_id, team);
        s.team_user_index.insert((team_id, user_id));
        s.user_team_index.insert((user_id, team_id));
        s.organization_team_index.insert((org_id, team_id));
    });

    team_id
}

pub fn list_user_team_ids(user_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.user_team_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .map(|(_, team_id)| team_id)
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
    organization_team_index: OrganizationTeamIndexMemory,
}

impl Default for TeamState {
    fn default() -> Self {
        Self {
            teams: init_teams(),
            team_user_index: init_team_user_index(),
            user_team_index: init_user_team_index(),
            organization_team_index: init_organization_team_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<TeamState> = RefCell::new(TeamState::default());
}

fn with_state<R>(f: impl FnOnce(&TeamState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut TeamState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
