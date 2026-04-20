use candid::CandidType;
use serde::Deserialize;

#[derive(Debug, Clone, Copy, CandidType, Deserialize)]
pub struct OrgPermissions {
    pub org_admin: bool,
    pub member_manage: bool,
    pub team_manage: bool,
    pub project_create: bool,
    pub billing_manage: bool,
}

#[derive(Debug, Clone, Copy, CandidType, Deserialize)]
pub struct ProjectPermissions {
    pub project_admin: bool,
    pub canister_manage: bool,
    pub proposal_create: bool,
    pub proposal_approve: bool,
    pub canister_operate: bool,
    pub canister_read: bool,
    pub approval_policy_manage: bool,
    pub project_settings: bool,
}
