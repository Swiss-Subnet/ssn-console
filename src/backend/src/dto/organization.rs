use candid::CandidType;
use serde::Deserialize;

pub type ListMyOrganizationsResponse = Vec<Organization>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct OrganizationResponse {
    pub organization: Organization,
}

pub type CreateOrganizationResponse = OrganizationResponse;
pub type GetOrganizationResponse = OrganizationResponse;
pub type UpdateOrganizationResponse = OrganizationResponse;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetOrganizationRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateOrganizationRequest {
    pub org_id: String,
    pub name: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteOrganizationRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeleteOrganizationResponse {}
