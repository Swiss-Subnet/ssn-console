use candid::CandidType;
use serde::Deserialize;

pub type ListMyOrganizationsResponse = Vec<Organization>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
}
