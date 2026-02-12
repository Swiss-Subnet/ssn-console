use candid::CandidType;
use serde::Deserialize;

pub type ListMyTeamsResponse = Vec<Team>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Team {
    pub id: String,
    pub name: String,
}
