use crate::{
    data::{self},
    dto::{ListTeamsResponse, Team, TeamResponse},
};
use canister_utils::Uuid;

pub fn map_list_teams_response(teams: Vec<(Uuid, data::Team)>) -> ListTeamsResponse {
    teams
        .into_iter()
        .map(|(team_id, team)| map_team(team_id, team))
        .collect()
}

pub fn map_team(team_id: Uuid, team: data::Team) -> Team {
    Team {
        id: team_id.to_string(),
        name: team.name,
    }
}

pub fn map_team_to_response(team_id: Uuid, team: data::Team) -> TeamResponse {
    TeamResponse {
        team: map_team(team_id, team),
    }
}
