use super::{OrgPermissions, Team};
use candid::CandidType;
use serde::Deserialize;

pub type ListMyOrganizationsResponse = Vec<Organization>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    // Union of the caller's org-level permissions across every team they
    // belong to within this org. Used by clients to gate UI without a
    // follow-up request.
    pub your_permissions: OrgPermissions,
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

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListOrgUsersRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct OrgUser {
    pub id: String,
    pub email: Option<String>,
    pub email_verified: bool,
    // Teams the user belongs to within the org being listed.
    pub teams: Vec<Team>,
    // True iff any of `teams` holds `OrgPermissions::ORG_ADMIN`. Flags don't
    // cascade, so this is specifically the ORG_ADMIN bit — not a summary of
    // all admin-ish permissions.
    pub is_org_admin: bool,
}

pub type ListOrgUsersResponse = Vec<OrgUser>;
