use candid::Principal;

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize)]
pub struct CanisterMetricsArgs {
    pub canister_id: Principal,
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize)]
pub struct CyclesConsumed {
    pub memory: candid::Nat,
    pub compute_allocation: candid::Nat,
    pub ingress_induction: candid::Nat,
    pub instructions: candid::Nat,
    pub request_and_response_transmission: candid::Nat,
    pub uninstall: candid::Nat,
    pub canister_creation: candid::Nat,
    pub http_outcalls: candid::Nat,
    pub burned_cycles: candid::Nat,
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize)]
pub struct CanisterMetricsResult {
    pub cycles_consumed: CyclesConsumed,
}
