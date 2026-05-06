use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Deserialize, Serialize)]
pub struct TriggerSyncMetricsRequest {}

#[derive(CandidType, Deserialize, Serialize)]
pub struct TriggerSyncMetricsResponse {
    pub message: String,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct ListMetricsAfterRequest {
    pub cursor: Option<Cursor>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct CyclesMetricsSnapshotDto {
    pub timestamp_ns: u64,
    pub canister_id: Principal,
    pub memory: Nat,
    pub compute_allocation: Nat,
    pub ingress_induction: Nat,
    pub instructions: Nat,
    pub request_and_response_transmission: Nat,
    pub uninstall: Nat,
    pub http_outcalls: Nat,
    pub burned_cycles: Nat,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct ListMetricsAfterResponse {
    pub snapshots: Vec<CyclesMetricsSnapshotDto>,
    pub next_cursor: Option<Cursor>,
}

#[derive(CandidType, Deserialize, Serialize, PartialEq, Eq, Debug, Copy, Clone)]
pub struct Cursor(pub u64, pub Principal);
