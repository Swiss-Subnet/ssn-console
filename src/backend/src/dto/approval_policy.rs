use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct ListProjectApprovalPoliciesRequest {
    pub project_id: String,
}

pub type ListProjectApprovalPoliciesResponse = Vec<ApprovalPolicy>;

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct ApprovalPolicy {
    pub id: String,
    pub operation_type: String,
    pub policy_type: String,
}
