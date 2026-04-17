use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateSubnetCanisterRangesRequest {
    pub canister_ranges: Vec<(Principal, Principal)>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateSubnetCanisterRangesResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TriggerSyncCanisterHistoriesRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TriggerSyncCanisterHistoriesResponse {
    pub message: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterRangesRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterRangesResponse {
    pub canister_ranges: Vec<(Principal, Principal)>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsResponse {
    pub canister_id_ranges: Vec<(Principal, Principal)>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListCanisterChangesRequest {
    pub canister_id: Principal,
    pub reverse: Option<bool>,
    pub limit: Option<u64>,
    pub page: Option<u64>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListCanisterChangesResponse {
    pub changes: Vec<CanisterChange>,
    pub is_deleted: bool,
    pub meta: PaginationMetaResponse,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterChange {
    pub id: String,
    pub canister_id: Principal,
    pub timestamp_nanos: u64,
    pub canister_version: u64,
    pub origin: Option<CanisterChangeOrigin>,
    pub details: Option<CanisterChangeDetails>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum CanisterChangeOrigin {
    FromUser {
        user_id: Principal,
    },
    FromCanister {
        canister_id: Principal,
        canister_version: Option<u64>,
    },
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum CanisterChangeDetails {
    Creation {
        controllers: Vec<Principal>,
        environment_variables_hash: Option<Vec<u8>>,
    },
    CodeUninstall {},
    CodeDeployment {
        mode: Option<CodeDeploymentMode>,
        module_hash: Vec<u8>,
    },
    LoadSnapshot {
        from_canister_id: Option<Principal>,
        snapshot_id: Vec<u8>,
        canister_version: u64,
        taken_at_timestamp: u64,
        source: Option<SnapshotSource>,
    },
    ControllersChange {
        controllers: Vec<Principal>,
    },
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum CodeDeploymentMode {
    Install {},
    Reinstall {},
    Upgrade {},
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum SnapshotSource {
    TakenFromCanister {},
    MetadataUpload {},
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct PaginationMetaResponse {
    pub limit: u64,
    pub page: u64,
    pub total_items: u64,
    pub total_pages: u64,
}
