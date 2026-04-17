use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum InviteTarget {
    Email(String),
    UserId(String),
    Principal(Principal),
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum InviteStatus {
    Pending,
    Accepted,
    Declined,
    Revoked,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct OrgInvite {
    pub id: String,
    pub org_id: String,
    pub org_name: String,
    pub created_by: String,
    pub created_at_ns: u64,
    pub expires_at_ns: u64,
    pub target: InviteTarget,
    pub status: InviteStatus,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateOrgInviteRequest {
    pub org_id: String,
    pub target: InviteTarget,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateOrgInviteResponse {
    pub invite: OrgInvite,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListOrgInvitesRequest {
    pub org_id: String,
}

pub type ListOrgInvitesResponse = Vec<OrgInvite>;

pub type ListMyInvitesResponse = Vec<OrgInvite>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeOrgInviteRequest {
    pub invite_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeOrgInviteResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AcceptOrgInviteRequest {
    pub invite_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AcceptOrgInviteResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeclineOrgInviteRequest {
    pub invite_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct DeclineOrgInviteResponse {}
