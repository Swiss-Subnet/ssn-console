use candid::CandidType;
use serde::Deserialize;

// Mirrors the OrgPermissions / ProjectPermissions DTO shape: each known
// flag is exposed as a named boolean. The frontend reads/writes specific
// flags by name without having to know bit positions, and adding a new
// flag is an explicit, reviewable candid evolution rather than a silent
// remapping. The model-layer `StaffPermissions` bitmask is the canonical
// in-canister form; this DTO converts to/from it via `mapping::*`.
#[derive(Debug, Clone, Copy, CandidType, Deserialize)]
pub struct StaffPermissions {
    pub read_all_orgs: bool,
    pub write_billing: bool,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GrantStaffPermissionsRequest {
    pub user_id: String,
    pub permissions: StaffPermissions,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GrantStaffPermissionsResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeStaffPermissionsRequest {
    pub user_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeStaffPermissionsResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetMyStaffPermissionsRequest {}

// Self-introspection. None means the caller is not staff. Never returns
// information about other users' staff status; admin-side listings live
// behind a separate, controller-gated surface (not shipped in this PR).
pub type GetMyStaffPermissionsResponse = Option<StaffPermissions>;
