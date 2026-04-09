use candid::CandidType;
use serde::Deserialize;

pub type ListTeamsResponse = Vec<Team>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Team {
    pub id: String,
    pub name: String,
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
pub struct AddUserToTeamRequest {
    pub team_id: String,
    pub user_id: String,
}
