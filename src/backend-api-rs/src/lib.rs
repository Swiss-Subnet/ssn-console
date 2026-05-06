use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddChildCanistersRequest {
    pub parent_child_mappings: Vec<ParentChildMapping>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct AddChildCanistersResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ParentChildMapping {
    pub parent_canister_id: Principal,
    pub child_canister_id: Principal,
}
