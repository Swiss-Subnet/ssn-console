use super::ProjectPermissions;
use candid::CandidType;
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyProjectsRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyProjectsResponse {
    pub projects: Vec<Project>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListOrgProjectsRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListOrgProjectsResponse {
    pub projects: Vec<Project>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Project {
    pub id: String,
    pub org_id: String,
    pub name: String,
    // Union of project permissions held by the caller across every team
    // they belong to that is linked to this project. Used by clients to
    // gate UI without a follow-up request.
    pub your_permissions: ProjectPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ProjectResponse {
    pub project: Project,
}

pub type CreateProjectResponse = ProjectResponse;
pub type GetProjectResponse = ProjectResponse;
pub type UpdateProjectResponse = ProjectResponse;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateProjectRequest {
    pub org_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetProjectRequest {
    pub project_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateProjectRequest {
    pub project_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteProjectRequest {
    pub project_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteProjectResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddTeamToProjectRequest {
    pub project_id: String,
    pub team_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddTeamToProjectResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RemoveTeamFromProjectRequest {
    pub project_id: String,
    pub team_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RemoveTeamFromProjectResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListProjectTeamsRequest {
    pub project_id: String,
}
