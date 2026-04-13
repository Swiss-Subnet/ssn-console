use crate::{
    data::{self},
    dto::{ListTeamUsersResponse, ListTeamsResponse, Team, TeamResponse, TeamUser},
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

pub fn map_list_team_users_response(
    users: Vec<(Uuid, data::UserProfile)>,
) -> ListTeamUsersResponse {
    users
        .into_iter()
        .map(|(id, profile)| TeamUser {
            id: id.to_string(),
            email: profile.email,
            email_verified: profile.email_verified,
        })
        .collect()
}
