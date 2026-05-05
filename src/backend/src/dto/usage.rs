use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpsertUsageRequest {
    pub usage: CanisterUsage,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterUsage {
    pub canister_id: Principal,
    pub month: u32,
    pub memory: u64,
    pub compute_allocation: u64,
    pub ingress_induction: u64,
    pub instructions: u64,
    pub request_and_response_transmission: u64,
    pub uninstall: u64,
    pub http_outcalls: u64,
    pub burned_cycles: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetUsageRequest {
    pub project_id: String,
    pub month: Option<u32>,
}
