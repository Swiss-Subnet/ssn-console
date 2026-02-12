use candid::CandidType;
use serde::Deserialize;

pub type ListMyProjectsResponse = Vec<Project>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
}
