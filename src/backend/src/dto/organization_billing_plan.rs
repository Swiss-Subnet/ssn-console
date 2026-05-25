use candid::CandidType;
use serde::Deserialize;

// Wire-form PlanTier. Distinct from the persistence model's PlanTier
// (which is u8-tagged for CBOR stability); the variant form is what
// admin tools and the frontend speak.
#[derive(Debug, Clone, Copy, CandidType, Deserialize)]
pub enum PlanTier {
    Free,
    Pro,
    Enterprise,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct SetOrgBillingPlanRequest {
    pub org_id: String,
    pub tier: PlanTier,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct SetOrgBillingPlanResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetOrgBillingPlanRequest {
    pub org_id: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetOrgBillingPlanResponse {
    pub tier: PlanTier,
    pub max_canisters: u32,
    pub canisters_used: u32,
    pub max_storage_bytes: Option<u64>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct MyOrgBillingPlan {
    pub org_id: String,
    pub tier: PlanTier,
    pub max_canisters: u32,
    pub canisters_used: u32,
    pub max_storage_bytes: Option<u64>,
}

pub type ListMyOrgBillingPlansResponse = Vec<MyOrgBillingPlan>;
