use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct ListProjectApprovalPoliciesRequest {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct ListProjectApprovalPoliciesResponse {
    pub approval_policies: Vec<ApprovalPolicy>,
}

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct UpsertApprovalPolicyRequest {
    pub project_id: String,
    pub operation_type: OperationType,
    pub policy_type: PolicyType,
}

pub type UpsertApprovalPolicyResponse = ApprovalPolicy;

#[derive(Debug, Clone, Serialize, CandidType, Deserialize)]
pub struct ApprovalPolicy {
    pub id: String,
    pub operation_type: OperationType,
    pub policy_type: PolicyType,
}

#[derive(Debug, Clone, Serialize, CandidType, Deserialize, PartialEq, Eq)]
pub enum OperationType {
    CreateCanister {},
    AddCanisterController {},
}

#[derive(Debug, Clone, Serialize, CandidType, Deserialize, PartialEq, Eq)]
pub enum PolicyType {
    AutoApprove {},
    FixedQuorum { threshold: u32 },
}
