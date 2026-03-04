use candid::CandidType;
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyProjectsResponse {
    pub orgs_with_projects: Vec<OrgWithProjects>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct OrgWithProjects {
    pub org_id: String,
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
