use crate::{
    data::{self, ProjectId, ProposalId},
    dto::{
        CreateProposalRequest, ListProjectProposalsResponse, Proposal, ProposalOperation,
        ProposalStatus, ProposalStatusFilter, ProposalVote, Vote, VoteProposalRequest,
    },
};
use canister_utils::{ApiError, ApiResult};

fn map_vote(vote: data::Vote) -> Vote {
    match vote {
        data::Vote::Approve => Vote::Approve {},
        data::Vote::Reject => Vote::Reject {},
    }
}

pub fn map_vote_proposal_request(req: VoteProposalRequest) -> ApiResult<(ProposalId, data::Vote)> {
    let proposal_id = ProposalId::try_from(req.proposal_id.as_str())?;
    let vote = match req.vote {
        Vote::Approve {} => data::Vote::Approve,
        Vote::Reject {} => data::Vote::Reject,
    };
    Ok((proposal_id, vote))
}

pub fn map_create_proposal_request(
    req: CreateProposalRequest,
) -> ApiResult<(ProjectId, data::ProposalOperation)> {
    let project_id = ProjectId::try_from(req.project_id.as_str())?;
    let operation = match req.operation {
        Some(ProposalOperation::CreateCanister {}) => data::ProposalOperation::CreateCanister,
        Some(ProposalOperation::AddCanisterController {
            canister_id,
            controller_id,
        }) => data::ProposalOperation::AddCanisterController {
            canister_id,
            controller_id,
        },
        None => {
            return Err(ApiError::client_error(
                "Failed to decode proposal request operation".to_string(),
            ))
        }
    };
    Ok((project_id, operation))
}

pub fn map_list_project_proposals_response(
    proposals: Vec<(ProposalId, data::Proposal)>,
    next_cursor: Option<ProposalId>,
) -> ListProjectProposalsResponse {
    ListProjectProposalsResponse {
        proposals: proposals
            .into_iter()
            .map(|(id, p)| map_proposal_response(id, p))
            .collect(),
        next_cursor: next_cursor.map(|id| id.to_string()),
    }
}

pub fn proposal_matches_status_filter(
    proposal: &data::Proposal,
    filter: &ProposalStatusFilter,
) -> bool {
    matches!(
        (&proposal.status, filter),
        (data::ProposalStatus::Open, ProposalStatusFilter::Open {})
            | (
                data::ProposalStatus::PendingApproval { .. },
                ProposalStatusFilter::PendingApproval {}
            )
            | (
                data::ProposalStatus::Rejected,
                ProposalStatusFilter::Rejected {}
            )
            | (
                data::ProposalStatus::Cancelled,
                ProposalStatusFilter::Cancelled {}
            )
            | (
                data::ProposalStatus::Executing,
                ProposalStatusFilter::Executing {}
            )
            | (
                data::ProposalStatus::Executed,
                ProposalStatusFilter::Executed {}
            )
            | (
                data::ProposalStatus::Failed(_),
                ProposalStatusFilter::Failed {}
            )
    )
}

pub fn map_proposal_response(proposal_id: ProposalId, proposal: data::Proposal) -> Proposal {
    Proposal {
        id: proposal_id.to_string(),
        project_id: proposal.project_id.to_string(),
        proposer_id: proposal.proposer_id.to_string(),
        created_at_nanos: proposal.created_at_nanos,
        updated_at_nanos: proposal.updated_at_nanos,
        status: match proposal.status {
            data::ProposalStatus::Open => Some(ProposalStatus::Open {}),
            data::ProposalStatus::PendingApproval {
                threshold,
                approvers,
                votes,
            } => Some(ProposalStatus::PendingApproval {
                threshold,
                approvers: approvers.into_iter().map(|u| u.to_string()).collect(),
                votes: votes
                    .into_iter()
                    .map(|(voter, vote)| ProposalVote {
                        voter: voter.to_string(),
                        vote: map_vote(vote),
                    })
                    .collect(),
            }),
            data::ProposalStatus::Rejected => Some(ProposalStatus::Rejected {}),
            data::ProposalStatus::Cancelled => Some(ProposalStatus::Cancelled {}),
            data::ProposalStatus::Executing => Some(ProposalStatus::Executing {}),
            data::ProposalStatus::Executed => Some(ProposalStatus::Executed {}),
            data::ProposalStatus::Failed(err) => Some(ProposalStatus::Failed { message: err }),
        },
        operation: match proposal.operation {
            data::ProposalOperation::CreateCanister => Some(ProposalOperation::CreateCanister {}),
            data::ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            } => Some(ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            }),
        },
    }
}
