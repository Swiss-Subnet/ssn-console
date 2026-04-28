use candid::{CandidType, Nat, Principal};
use serde::Deserialize;

pub type ListMyCanistersResponse = Vec<Canister>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyCanistersRequest {
    pub project_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListUserCanistersRequest {
    pub user_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListUserCanistersResponse {
    pub canisters: Vec<Canister>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListAllCanistersRequest {
    pub limit: Option<u64>,
    pub page: Option<u64>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListAllCanistersResponse {
    pub canisters: Vec<CanisterWithOwner>,
    pub meta: PaginationMetaResponse,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterWithOwner {
    pub id: String,
    pub principal_id: String,
    pub user_id: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct PaginationMetaResponse {
    pub limit: u64,
    pub page: u64,
    pub total_items: u64,
    pub total_pages: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Canister {
    pub id: String,
    pub principal_id: String,
    pub name: Option<String>,
    pub state: CanisterState,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum CanisterState {
    Accessible(Box<CanisterInfo>),
    Inaccessible,
    Deleted,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RemoveMyCanisterRequest {
    pub canister_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateMyCanisterNameRequest {
    pub canister_id: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterInfo {
    pub status: CanisterStatus,
    pub ready_for_migration: bool,
    pub version: u64,
    pub settings: CanisterSettings,
    pub module_hash: Option<Vec<u8>>,
    pub memory_size: Nat,
    pub memory_metrics: MemoryMetrics,
    pub cycles: Nat,
    pub reserved_cycles: Nat,
    pub idle_cycles_burned_per_day: Nat,
    pub query_stats: QueryStats,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum CanisterStatus {
    Running,
    Stopping,
    Stopped,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct QueryStats {
    pub num_calls_total: Nat,
    pub num_instructions_total: Nat,
    pub request_payload_bytes_total: Nat,
    pub response_payload_bytes_total: Nat,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct MemoryMetrics {
    pub wasm_memory_size: Nat,
    pub stable_memory_size: Nat,
    pub global_memory_size: Nat,
    pub wasm_binary_size: Nat,
    pub custom_sections_size: Nat,
    pub canister_history_size: Nat,
    pub wasm_chunk_store_size: Nat,
    pub snapshots_size: Nat,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterSettings {
    pub controllers: Vec<Principal>,
    pub compute_allocation: Nat,
    pub memory_allocation: Nat,
    pub freezing_threshold: Nat,
    pub reserved_cycles_limit: Nat,
    pub log_visibility: LogVisibility,
    pub wasm_memory_limit: Nat,
    pub wasm_memory_threshold: Nat,
    pub environment_variables: Vec<EnvironmentVariable>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum LogVisibility {
    Controllers,
    Public,
    AllowedViewers(Vec<Principal>),
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct EnvironmentVariable {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddChildCanistersRequest {
    pub parent_child_mappings: Vec<ParentChildMapping>,
}

#[derive(candid::CandidType, serde::Deserialize)]
pub struct AddChildCanistersResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ParentChildMapping {
    pub parent_canister_id: Principal,
    pub child_canister_id: Principal,
}
