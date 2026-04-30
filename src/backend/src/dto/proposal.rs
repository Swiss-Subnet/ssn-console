use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateProposalRequest {
    pub project_id: String,
    pub operation: Option<ProposalOperation>,
}

pub type CreateProposalResponse = Proposal;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetProposalRequest {
    pub proposal_id: String,
}

pub type GetProposalResponse = Proposal;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListProjectProposalsRequest {
    pub project_id: String,
    pub status_filter: Option<Vec<ProposalStatusFilter>>,
    pub after: Option<String>,
    pub limit: Option<u64>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListProjectProposalsResponse {
    pub proposals: Vec<Proposal>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, CandidType, Deserialize, PartialEq, Eq)]
pub enum ProposalStatusFilter {
    Open {},
    PendingApproval {},
    Rejected {},
    Cancelled {},
    Executing {},
    Executed {},
    Failed {},
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct VoteProposalRequest {
    pub proposal_id: String,
    pub vote: Vote,
}

pub type VoteProposalResponse = Proposal;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CancelProposalRequest {
    pub proposal_id: String,
}

pub type CancelProposalResponse = Proposal;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub project_id: String,
    pub proposer_id: String,
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
    Cancelled {},
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
