use super::Proposal;
use crate::data::{
    memory::{
        init_project_proposal_index, init_proposals, ProjectProposalIndexMemory, ProposalMemory,
    },
    ProposalStatus, Vote,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoteOutcome {
    ReachedApproval,
    ReachedRejection,
    StillPending,
}

pub fn create_proposal(project_id: Uuid, proposal: Proposal) -> Uuid {
    let proposal_id = Uuid::new();

    mutate_state(|s| {
        s.proposals.insert(proposal_id, proposal);
        s.project_proposals_index.insert((project_id, proposal_id));
    });

    proposal_id
}

pub fn get_proposal(proposal_id: &Uuid) -> Option<Proposal> {
    with_state(|s| s.proposals.get(proposal_id))
}

pub fn set_proposal_pending_approval(
    proposal_id: Uuid,
    threshold: u32,
    approvers: Vec<Principal>,
) -> ApiResult {
    mutate_state(|s| {
        let mut proposal = s.proposals.get(&proposal_id).ok_or_else(|| {
            ApiError::client_error(format!(
                "Failed to set status for proposal {proposal_id}, proposal does not exist."
            ))
        })?;

        if !matches!(proposal.status, ProposalStatus::Open) {
            return Err(ApiError::client_error(format!(
                "Proposal {proposal_id} is not open; cannot move to pending approval."
            )));
        }

        proposal.status = ProposalStatus::PendingApproval {
            threshold,
            approvers,
            votes: Vec::new(),
        };
        s.proposals.insert(proposal_id, proposal);

        Ok(())
    })
}

pub fn record_proposal_vote(
    proposal_id: Uuid,
    voter: Principal,
    vote: Vote,
) -> ApiResult<VoteOutcome> {
    mutate_state(|s| {
        let mut proposal = s.proposals.get(&proposal_id).ok_or_else(|| {
            ApiError::client_error(format!(
                "Failed to record vote for proposal {proposal_id}, proposal does not exist."
            ))
        })?;

        let ProposalStatus::PendingApproval {
            threshold,
            approvers,
            mut votes,
        } = proposal.status.clone()
        else {
            return Err(ApiError::client_error(format!(
                "Proposal {proposal_id} is not pending approval."
            )));
        };

        if !approvers.contains(&voter) {
            return Err(ApiError::client_error(format!(
                "Principal {voter} is not an approver for proposal {proposal_id}."
            )));
        }

        if votes.iter().any(|(v, _)| v == &voter) {
            return Err(ApiError::client_error(format!(
                "Principal {voter} has already voted on proposal {proposal_id}."
            )));
        }

        votes.push((voter, vote));

        let approvals = votes.iter().filter(|(_, v)| *v == Vote::Approve).count() as u32;
        let rejections = votes.iter().filter(|(_, v)| *v == Vote::Reject).count() as u32;
        let total = approvers.len() as u32;
        let outcome = if approvals >= threshold {
            VoteOutcome::ReachedApproval
        } else if rejections > total.saturating_sub(threshold) {
            VoteOutcome::ReachedRejection
        } else {
            VoteOutcome::StillPending
        };

        proposal.status = match outcome {
            VoteOutcome::ReachedRejection => ProposalStatus::Rejected,
            _ => ProposalStatus::PendingApproval {
                threshold,
                approvers,
                votes,
            },
        };
        s.proposals.insert(proposal_id, proposal);

        Ok(outcome)
    })
}

pub fn set_proposal_executing(proposal_id: Uuid) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Executing)
}

pub fn set_proposal_executed(proposal_id: Uuid) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Executed)
}

pub fn set_proposal_failed(proposal_id: Uuid, message: String) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Failed(message))
}

fn set_proposal_status(proposal_id: Uuid, status: ProposalStatus) -> ApiResult {
    mutate_state(|s| {
        let mut proposal = s.proposals.get(&proposal_id).ok_or_else(|| {
            ApiError::client_error(format!(
                "Failed to set status for proposal {proposal_id}, proposal does not exist."
            ))
        })?;

        proposal.status = status;
        s.proposals.insert(proposal_id, proposal);

        Ok(())
    })
}

struct ProposalState {
    proposals: ProposalMemory,
    project_proposals_index: ProjectProposalIndexMemory,
}

impl Default for ProposalState {
    fn default() -> Self {
        Self {
            proposals: init_proposals(),
            project_proposals_index: init_project_proposal_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<ProposalState> = RefCell::new(ProposalState::default());
}

fn with_state<R>(f: impl FnOnce(&ProposalState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut ProposalState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::ProposalOperation;

    fn principal(byte: u8) -> Principal {
        Principal::from_slice(&[byte])
    }

    fn seed_pending_proposal(threshold: u32, approvers: Vec<Principal>) -> Uuid {
        let project_id = Uuid::new();
        let proposal_id = create_proposal(
            project_id,
            Proposal {
                project_id,
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
            },
        );
        set_proposal_pending_approval(proposal_id, threshold, approvers).unwrap();
        proposal_id
    }

    #[test]
    fn set_pending_approval_rejects_non_open_status() {
        let id = seed_pending_proposal(2, vec![principal(1), principal(2)]);
        let err = set_proposal_pending_approval(id, 2, vec![principal(1)]).unwrap_err();
        assert!(err.message().contains("not open"));
    }

    #[test]
    fn vote_approve_reaches_threshold_but_leaves_status_pending() {
        let a = principal(1);
        let b = principal(2);
        let c = principal(3);
        let id = seed_pending_proposal(2, vec![a, b, c]);

        assert_eq!(
            record_proposal_vote(id, a, Vote::Approve).unwrap(),
            VoteOutcome::StillPending
        );
        assert_eq!(
            record_proposal_vote(id, b, Vote::Approve).unwrap(),
            VoteOutcome::ReachedApproval
        );

        // Repository must not flip to Executing — that's the service layer's job.
        let proposal = get_proposal(&id).unwrap();
        match proposal.status {
            ProposalStatus::PendingApproval { votes, .. } => assert_eq!(votes.len(), 2),
            other => panic!("expected PendingApproval, got {other:?}"),
        }
    }

    #[test]
    fn vote_reject_flips_to_rejected_when_threshold_unreachable() {
        let a = principal(1);
        let b = principal(2);
        let c = principal(3);
        // threshold 2 of 3 → only 1 reject allowed before unreachable.
        let id = seed_pending_proposal(2, vec![a, b, c]);

        assert_eq!(
            record_proposal_vote(id, a, Vote::Reject).unwrap(),
            VoteOutcome::StillPending
        );
        assert_eq!(
            record_proposal_vote(id, b, Vote::Reject).unwrap(),
            VoteOutcome::ReachedRejection
        );
        assert!(matches!(
            get_proposal(&id).unwrap().status,
            ProposalStatus::Rejected
        ));
    }

    #[test]
    fn unanimous_threshold_rejects_on_first_reject() {
        let a = principal(1);
        let b = principal(2);
        let id = seed_pending_proposal(2, vec![a, b]);

        assert_eq!(
            record_proposal_vote(id, a, Vote::Reject).unwrap(),
            VoteOutcome::ReachedRejection
        );
    }

    #[test]
    fn mixed_votes_can_still_reach_approval() {
        let a = principal(1);
        let b = principal(2);
        let c = principal(3);
        let id = seed_pending_proposal(2, vec![a, b, c]);

        record_proposal_vote(id, a, Vote::Approve).unwrap();
        record_proposal_vote(id, b, Vote::Reject).unwrap();
        assert_eq!(
            record_proposal_vote(id, c, Vote::Approve).unwrap(),
            VoteOutcome::ReachedApproval
        );
    }

    #[test]
    fn vote_from_non_approver_is_rejected() {
        let a = principal(1);
        let outsider = principal(99);
        let id = seed_pending_proposal(1, vec![a]);

        let err = record_proposal_vote(id, outsider, Vote::Approve).unwrap_err();
        assert!(err.message().contains("is not an approver"));
    }

    #[test]
    fn duplicate_vote_is_rejected() {
        let a = principal(1);
        let b = principal(2);
        let id = seed_pending_proposal(2, vec![a, b]);

        record_proposal_vote(id, a, Vote::Approve).unwrap();
        let err = record_proposal_vote(id, a, Vote::Reject).unwrap_err();
        assert!(err.message().contains("already voted"));
    }

    #[test]
    fn vote_on_non_pending_proposal_is_rejected() {
        let project_id = Uuid::new();
        let id = create_proposal(
            project_id,
            Proposal {
                project_id,
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
            },
        );

        let err = record_proposal_vote(id, principal(1), Vote::Approve).unwrap_err();
        assert!(err.message().contains("not pending approval"));
    }

    #[test]
    fn vote_on_missing_proposal_is_rejected() {
        let err = record_proposal_vote(Uuid::new(), principal(1), Vote::Approve).unwrap_err();
        assert!(err.message().contains("does not exist"));
    }
}
