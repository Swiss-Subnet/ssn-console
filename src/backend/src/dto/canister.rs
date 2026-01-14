use candid::CandidType;
use serde::Deserialize;

pub type ListCanistersResponse = Vec<Canister>;

pub type ListMyCanistersResponse = Vec<Canister>;

pub type CreateCanisterResponse = Canister;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Canister {
    pub id: String,
    pub principal_id: String,
}
