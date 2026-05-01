use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpsertUsageRequest {
    pub usages: Vec<CanisterUsage>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpsertUsageResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetUsageResponse {
    pub project: ProjectUsage,
    pub canisters: Vec<CanisterUsage>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ProjectUsage {
    pub memory: u64,
    pub memory_bytes: u64,
    pub compute_allocation: u64,
    pub compute_allocation_percent: u64,
    pub ingress_induction: u64,
    pub ingress_induction_bytes_total: u64,
    pub instructions: u64,
    pub compute_time_seconds_total: u64,
    pub request_and_response_transmission: u64,
    pub transmission_bytes_total: u64,
    pub uninstall: u64,
    pub uninstalls_total: u64,
    pub http_outcalls: u64,
    pub burned_cycles: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CanisterUsage {
    pub canister_id: Principal,
    pub memory: u64,
    pub memory_bytes: u64,
    pub compute_allocation: u64,
    pub compute_allocation_percent: u64,
    pub ingress_induction: u64,
    pub ingress_induction_bytes_total: u64,
    pub instructions: u64,
    pub compute_time_seconds_total: u64,
    pub request_and_response_transmission: u64,
    pub transmission_bytes_total: u64,
    pub uninstall: u64,
    pub uninstalls_total: u64,
    pub http_outcalls: u64,
    pub burned_cycles: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetUsageRequest {
    pub project_id: String,
    pub billing_month: Option<String>,
}
