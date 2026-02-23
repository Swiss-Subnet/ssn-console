use super::PROJECT_PROPOSAL_INDEX_MEMORY_ID;
use crate::data::{
    memory::{get_memory, Memory, PROPOSAL_MEMORY_ID},
    Proposal,
};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type ProposalMemory = BTreeMap<Uuid, Proposal, Memory>;
pub type ProjectProposalIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_proposals() -> ProposalMemory {
    ProposalMemory::init(get_proposal_memory())
}

pub fn init_project_proposal_index() -> ProjectProposalIndexMemory {
    ProjectProposalIndexMemory::init(get_project_proposal_index_memory_id())
}

fn get_proposal_memory() -> Memory {
    get_memory(PROPOSAL_MEMORY_ID)
}

fn get_project_proposal_index_memory_id() -> Memory {
    get_memory(PROJECT_PROPOSAL_INDEX_MEMORY_ID)
}
