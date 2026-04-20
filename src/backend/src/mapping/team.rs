use crate::{
    data::{self},
    dto::{
        ListOrgTeamsResponse, ListProjectTeamsResponse, ListTeamUsersResponse, ListTeamsResponse,
        OrgTeam, ProjectTeam, Team, TeamResponse, TeamUser,
    },
    mapping::{map_org_permissions, map_project_permissions},
};
use canister_utils::Uuid;

pub fn map_list_teams_response(teams: Vec<(Uuid, data::Team)>) -> ListTeamsResponse {
    teams
        .into_iter()
        .map(|(team_id, team)| map_team(team_id, team))
        .collect()
}

pub fn map_list_org_teams_response(
    teams: Vec<(Uuid, data::Team, data::OrgPermissions)>,
) -> ListOrgTeamsResponse {
    teams
        .into_iter()
        .map(|(team_id, team, perms)| map_org_team(team_id, team, perms))
        .collect()
}

pub fn map_list_project_teams_response(
    teams: Vec<(Uuid, data::Team, data::ProjectPermissions)>,
) -> ListProjectTeamsResponse {
    teams
        .into_iter()
        .map(|(team_id, team, perms)| map_project_team(team_id, team, perms))
        .collect()
}

pub fn map_team(team_id: Uuid, team: data::Team) -> Team {
    Team {
        id: team_id.to_string(),
        name: team.name,
    }
}

pub fn map_org_team(team_id: Uuid, team: data::Team, perms: data::OrgPermissions) -> OrgTeam {
    OrgTeam {
        id: team_id.to_string(),
        name: team.name,
        permissions: map_org_permissions(perms),
    }
}

pub fn map_project_team(
    team_id: Uuid,
    team: data::Team,
    perms: data::ProjectPermissions,
) -> ProjectTeam {
    ProjectTeam {
        id: team_id.to_string(),
        name: team.name,
        permissions: map_project_permissions(perms),
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
