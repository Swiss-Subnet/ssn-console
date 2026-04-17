use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Deserialize, Serialize)]
pub struct GetCanisterMetricsRequest {
    pub canister_id: Principal,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct CyclesConsumedResponse {
    pub memory: Nat,
    pub compute_allocation: Nat,
    pub ingress_induction: Nat,
    pub instructions: Nat,
    pub request_and_response_transmission: Nat,
    pub uninstall: Nat,
    pub canister_creation: Nat,
    pub http_outcalls: Nat,
    pub burned_cycles: Nat,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct GetCanisterMetricsResponse {
    pub cycles_consumed: CyclesConsumedResponse,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct TriggerSyncMetricsRequest {}

#[derive(CandidType, Deserialize, Serialize)]
pub struct TriggerSyncMetricsResponse {
    pub message: String,
}
