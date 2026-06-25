use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsResponse {
    pub canister_id_ranges: Vec<(Principal, Principal)>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListKnownCanistersRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct KnownCanister {
    pub canister_id: Principal,
    pub is_deleted: bool,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListKnownCanistersResponse {
    pub canisters: Vec<KnownCanister>,
}
