use super::Proposal;
use crate::data::{
    memory::{
        init_project_proposal_index, init_proposals, ProjectProposalIndexMemory, ProposalMemory,
    },
    ProjectId, ProposalId, ProposalStatus, UserId, Vote,
};
use candid::Principal;
use canister_utils::{now_nanos, ApiError, ApiResult};
use std::cell::RefCell;
use std::ops::Bound::{Excluded, Included};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoteOutcome {
    ReachedApproval,
    ReachedRejection,
    StillPending,
}

pub fn create_proposal(project_id: ProjectId, mut proposal: Proposal) -> ProposalId {
    // The nil UUID is reserved for legacy proposals predating proposer_id; new
    // proposals always carry a real proposer (the authenticated caller).
    debug_assert!(
        proposal.proposer_id != UserId::default(),
        "create_proposal called with nil proposer_id"
    );
    let proposal_id = ProposalId::new();
    let now = now_nanos();
    proposal.created_at_nanos = Some(now);
    proposal.updated_at_nanos = Some(now);

    mutate_state(|s| {
        s.proposals.insert(proposal_id, proposal);
        s.project_proposals_index.insert((project_id, proposal_id));
    });

    proposal_id
}

pub fn get_proposal(proposal_id: &ProposalId) -> Option<Proposal> {
    with_state(|s| s.proposals.get(proposal_id))
}

// Scan proposals for `project_id` starting strictly after the `after` cursor
// (or from the beginning when None), keep those matching `filter`, and return
// up to `limit` matches. Filtering happens before `take` so a sparse filter
// still fills the page; the cursor advances by matched id, not scan position.
pub fn list_project_proposals<F>(
    project_id: ProjectId,
    after: Option<ProposalId>,
    limit: usize,
    filter: F,
) -> Vec<(ProposalId, Proposal)>
where
    F: Fn(&Proposal) -> bool,
{
    with_state(|s| {
        let start = match after {
            Some(cursor) => Excluded((project_id, cursor)),
            None => Included((project_id, ProposalId::MIN)),
        };
        let end = Included((project_id, ProposalId::MAX));
        s.project_proposals_index
            .range((start, end))
            .filter_map(|(_, proposal_id)| {
                s.proposals
                    .get(&proposal_id)
                    .map(|proposal| (proposal_id, proposal))
            })
            .filter(|(_, proposal)| filter(proposal))
            .take(limit)
            .collect()
    })
}

pub fn set_proposal_pending_approval(
    proposal_id: ProposalId,
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
        proposal.updated_at_nanos = Some(now_nanos());
        s.proposals.insert(proposal_id, proposal);

        Ok(())
    })
}

pub fn record_proposal_vote(
    proposal_id: ProposalId,
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
        proposal.updated_at_nanos = Some(now_nanos());
        s.proposals.insert(proposal_id, proposal);

        Ok(outcome)
    })
}

pub fn cancel_proposal(proposal_id: ProposalId) -> ApiResult {
    mutate_state(|s| {
        let mut proposal = s.proposals.get(&proposal_id).ok_or_else(|| {
            ApiError::client_error(format!(
                "Failed to cancel proposal {proposal_id}, proposal does not exist."
            ))
        })?;

        if !matches!(
            proposal.status,
            ProposalStatus::Open | ProposalStatus::PendingApproval { .. }
        ) {
            return Err(ApiError::client_error(format!(
                "Proposal {proposal_id} cannot be cancelled in its current state."
            )));
        }

        proposal.status = ProposalStatus::Cancelled;
        proposal.updated_at_nanos = Some(now_nanos());
        s.proposals.insert(proposal_id, proposal);

        Ok(())
    })
}

pub fn set_proposal_executing(proposal_id: ProposalId) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Executing)
}

pub fn set_proposal_executed(proposal_id: ProposalId) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Executed)
}

pub fn set_proposal_failed(proposal_id: ProposalId, message: String) -> ApiResult {
    set_proposal_status(proposal_id, ProposalStatus::Failed(message))
}

fn set_proposal_status(proposal_id: ProposalId, status: ProposalStatus) -> ApiResult {
    mutate_state(|s| {
        let mut proposal = s.proposals.get(&proposal_id).ok_or_else(|| {
            ApiError::client_error(format!(
                "Failed to set status for proposal {proposal_id}, proposal does not exist."
            ))
        })?;

        proposal.status = status;
        proposal.updated_at_nanos = Some(now_nanos());
        s.proposals.insert(proposal_id, proposal);

        Ok(())
    })
}

pub fn migrate_proposals_proposer_id() {
    mutate_state(|s| {
        let ids: Vec<ProposalId> = s.proposals.iter().map(|e| e.into_pair().0).collect();
        let mut rewritten: u32 = 0;
        let mut legacy: u32 = 0;
        for id in ids {
            let Some(proposal) = s.proposals.get(&id) else {
                continue;
            };
            if proposal.proposer_id == UserId::default() {
                legacy += 1;
            }
            s.proposals.insert(id, proposal);
            rewritten += 1;
        }
        ic_cdk::println!(
            "migrate_proposals_proposer_id: rewritten={rewritten} legacy_nil_proposer={legacy}"
        );
    });
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![
            ("proposals", s.proposals.len()),
            ("project_proposals_index", s.project_proposals_index.len()),
        ]
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
    use crate::data::{ProposalOperation, UserId};
    use crate::test_support::fresh_principal;

    fn seed_pending_proposal(threshold: u32, approvers: Vec<Principal>) -> ProposalId {
        let project_id = ProjectId::new();
        let proposal_id = create_proposal(
            project_id,
            Proposal {
                project_id,
                proposer_id: UserId::new(),
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
                created_at_nanos: None,
                updated_at_nanos: None,
            },
        );
        set_proposal_pending_approval(proposal_id, threshold, approvers).unwrap();
        proposal_id
    }

    #[test]
    #[should_panic(expected = "nil proposer_id")]
    fn create_proposal_rejects_nil_proposer() {
        let project_id = ProjectId::new();
        create_proposal(
            project_id,
            Proposal {
                project_id,
                proposer_id: UserId::default(),
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
                created_at_nanos: None,
                updated_at_nanos: None,
            },
        );
    }

    #[test]
    fn set_pending_approval_rejects_non_open_status() {
        let a = fresh_principal();
        let id = seed_pending_proposal(2, vec![a, fresh_principal()]);
        let err = set_proposal_pending_approval(id, 2, vec![a]).unwrap_err();
        assert!(err.message().contains("not open"));
    }

    #[test]
    fn vote_approve_reaches_threshold_but_leaves_status_pending() {
        let a = fresh_principal();
        let b = fresh_principal();
        let c = fresh_principal();
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
        let a = fresh_principal();
        let b = fresh_principal();
        let c = fresh_principal();
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
        let a = fresh_principal();
        let b = fresh_principal();
        let id = seed_pending_proposal(2, vec![a, b]);

        assert_eq!(
            record_proposal_vote(id, a, Vote::Reject).unwrap(),
            VoteOutcome::ReachedRejection
        );
    }

    #[test]
    fn mixed_votes_can_still_reach_approval() {
        let a = fresh_principal();
        let b = fresh_principal();
        let c = fresh_principal();
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
        let a = fresh_principal();
        let outsider = fresh_principal();
        let id = seed_pending_proposal(1, vec![a]);

        let err = record_proposal_vote(id, outsider, Vote::Approve).unwrap_err();
        assert!(err.message().contains("is not an approver"));
    }

    #[test]
    fn duplicate_vote_is_rejected() {
        let a = fresh_principal();
        let b = fresh_principal();
        let id = seed_pending_proposal(2, vec![a, b]);

        record_proposal_vote(id, a, Vote::Approve).unwrap();
        let err = record_proposal_vote(id, a, Vote::Reject).unwrap_err();
        assert!(err.message().contains("already voted"));
    }

    #[test]
    fn vote_on_non_pending_proposal_is_rejected() {
        let project_id = ProjectId::new();
        let id = create_proposal(
            project_id,
            Proposal {
                project_id,
                proposer_id: UserId::new(),
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
                created_at_nanos: None,
                updated_at_nanos: None,
            },
        );

        let err = record_proposal_vote(id, fresh_principal(), Vote::Approve).unwrap_err();
        assert!(err.message().contains("not pending approval"));
    }

    #[test]
    fn vote_on_missing_proposal_is_rejected() {
        let err =
            record_proposal_vote(ProposalId::new(), fresh_principal(), Vote::Approve).unwrap_err();
        assert!(err.message().contains("does not exist"));
    }

    mod migration {
        // The legacy on-disk struct is intentionally keyed by raw Uuid to
        // reproduce the pre-Id<T> CBOR shape; the typed-id ban is for
        // production code paths.
        #![allow(clippy::disallowed_types)]
        use super::*;
        use canister_utils::{serialize_cbor, Uuid};
        use ic_stable_structures::Storable;
        use serde::Serialize;
        use std::borrow::Cow;

        // Pre-PR-#125 on-disk shape: no `proposer_id`. Field order/names must
        // match `Proposal` so CBOR map keys line up.
        #[derive(Serialize)]
        struct LegacyProposal {
            project_id: Uuid,
            status: ProposalStatus,
            operation: ProposalOperation,
        }

        #[test]
        fn legacy_proposal_decodes_with_nil_proposer_and_survives_migration() {
            let project_id = ProjectId::new();
            let proposal_id = ProposalId::new();
            // Serialize via the raw Uuid-keyed legacy struct; Id<T> is
            // serde-transparent over Uuid so the bytes line up.
            let legacy_bytes = serialize_cbor(&LegacyProposal {
                project_id: project_id.into_uuid(),
                status: ProposalStatus::Open,
                operation: ProposalOperation::CreateCanister,
            });

            // Without `#[serde(default)]` on proposer_id this would panic.
            let decoded = Proposal::from_bytes(Cow::Owned(legacy_bytes));
            assert_eq!(decoded.proposer_id, UserId::default());
            assert_eq!(decoded.project_id, project_id);

            mutate_state(|s| {
                s.proposals.insert(proposal_id, decoded);
                s.project_proposals_index.insert((project_id, proposal_id));
            });

            migrate_proposals_proposer_id();

            let after = get_proposal(&proposal_id).unwrap();
            assert_eq!(after.proposer_id, UserId::default());
            assert_eq!(after.project_id, project_id);
        }
    }
}
