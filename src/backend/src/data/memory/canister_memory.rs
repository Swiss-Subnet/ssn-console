use crate::data::{
    memory::{get_memory, Memory, CANISTERS_MEMORY_ID, PROJECT_CANISTER_INDEX_MEMORY_ID},
    Canister,
};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CanisterMemory = BTreeMap<Uuid, Canister, Memory>;
pub type ProjectCanisterIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_canisters() -> CanisterMemory {
    CanisterMemory::init(get_canisters_memory())
}

pub fn init_project_canister_index() -> ProjectCanisterIndexMemory {
    ProjectCanisterIndexMemory::init(get_project_canister_index_memory())
}

fn get_canisters_memory() -> Memory {
    get_memory(CANISTERS_MEMORY_ID)
}

fn get_project_canister_index_memory() -> Memory {
    get_memory(PROJECT_CANISTER_INDEX_MEMORY_ID)
}
