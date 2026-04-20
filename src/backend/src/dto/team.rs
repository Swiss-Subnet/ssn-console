use super::{OrgPermissions, ProjectPermissions};
use candid::CandidType;
use serde::Deserialize;

pub type ListTeamsResponse = Vec<Team>;
pub type ListOrgTeamsResponse = Vec<OrgTeam>;
pub type ListProjectTeamsResponse = Vec<ProjectTeam>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Team {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct OrgTeam {
    pub id: String,
    pub name: String,
    // Permissions this team holds within its parent org.
    pub permissions: OrgPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ProjectTeam {
    pub id: String,
    pub name: String,
    // Permissions this team holds on the project it was listed under.
    pub permissions: ProjectPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TeamResponse {
    pub team: Team,
}

pub type CreateTeamResponse = TeamResponse;
pub type GetTeamResponse = TeamResponse;
pub type UpdateTeamResponse = TeamResponse;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateTeamRequest {
    pub org_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetTeamRequest {
    pub team_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListOrgTeamsRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateTeamRequest {
    pub team_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteTeamRequest {
    pub team_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteTeamResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddUserToTeamRequest {
    pub team_id: String,
    pub user_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddUserToTeamResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateTeamOrgPermissionsRequest {
    pub team_id: String,
    pub permissions: OrgPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateTeamOrgPermissionsResponse {
    pub team: OrgTeam,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateTeamProjectPermissionsRequest {
    pub project_id: String,
    pub team_id: String,
    pub permissions: ProjectPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateTeamProjectPermissionsResponse {
    pub team: ProjectTeam,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListTeamUsersRequest {
    pub team_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TeamUser {
    pub id: String,
    pub email: Option<String>,
    pub email_verified: bool,
}

pub type ListTeamUsersResponse = Vec<TeamUser>;
