use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateProposalRequest {
    pub project_id: String,
    pub operation: Option<ProposalOperation>,
}

pub type CreateProposalResponse = Proposal;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub project_id: String,
    pub status: Option<ProposalStatus>,
    pub operation: Option<ProposalOperation>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum ProposalStatus {
    Open {},
    PendingApproval {
        threshold: u32,
        approvers: Vec<Principal>,
        votes: Vec<ProposalVote>,
    },
    Rejected {},
    Executing {},
    Executed {},
    Failed {
        message: String,
    },
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ProposalVote {
    pub voter: Principal,
    pub vote: Vote,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum Vote {
    Approve {},
    Reject {},
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum ProposalOperation {
    CreateCanister {},
    AddCanisterController {
        canister_id: Principal,
        controller_id: Principal,
    },
}
