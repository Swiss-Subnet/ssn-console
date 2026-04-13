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
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateProjectRequest {
    pub org_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateProjectResponse {
    pub project: Project,
}
