use crate::{
    data::{self},
    dto::{ListMyTeamsResponse, Team},
};

pub fn map_list_my_teams_response(teams: Vec<(data::Uuid, data::Team)>) -> ListMyTeamsResponse {
    teams
        .into_iter()
        .map(|(team_id, team)| map_team_response(team_id, team))
        .collect()
}

pub fn map_team_response(team_id: data::Uuid, team: data::Team) -> Team {
    Team {
        id: team_id.to_string(),
        name: team.name,
    }
}
