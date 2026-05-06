use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListSubnetCanisterIdsResponse {
    pub canister_id_ranges: Vec<(Principal, Principal)>,
}
