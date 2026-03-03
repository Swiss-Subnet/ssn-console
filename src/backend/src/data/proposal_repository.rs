use super::Proposal;
use crate::data::{
    memory::{
        init_project_proposal_index, init_proposals, ProjectProposalIndexMemory, ProposalMemory,
    },
    ProposalStatus,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

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
