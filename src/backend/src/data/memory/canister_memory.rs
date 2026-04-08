use crate::data::{
    memory::{
        get_memory, Memory, CANISTERS_MEMORY_ID, CANISTER_PROJECT_INDEX_MEMORY_ID,
        PROJECT_CANISTER_COUNT_MEMORY_ID, PROJECT_CANISTER_INDEX_MEMORY_ID,
    },
    Canister,
};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CanisterMemory = BTreeMap<Uuid, Canister, Memory>;
pub type ProjectCanisterIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type CanisterProjectIndexMemory = BTreeMap<Uuid, Uuid, Memory>;
pub type ProjectCanisterCountMemory = BTreeMap<Uuid, u64, Memory>;

pub fn init_canisters() -> CanisterMemory {
    CanisterMemory::init(get_canisters_memory())
}

pub fn init_project_canister_index() -> ProjectCanisterIndexMemory {
    ProjectCanisterIndexMemory::init(get_project_canister_index_memory())
}

pub fn init_canister_project_index() -> CanisterProjectIndexMemory {
    CanisterProjectIndexMemory::init(get_canister_project_index_memory())
}

pub fn init_project_canister_count() -> ProjectCanisterCountMemory {
    ProjectCanisterCountMemory::init(get_project_canister_count_memory())
}

fn get_canisters_memory() -> Memory {
    get_memory(CANISTERS_MEMORY_ID)
}

fn get_project_canister_index_memory() -> Memory {
    get_memory(PROJECT_CANISTER_INDEX_MEMORY_ID)
}

fn get_canister_project_index_memory() -> Memory {
    get_memory(CANISTER_PROJECT_INDEX_MEMORY_ID)
}

fn get_project_canister_count_memory() -> Memory {
    get_memory(PROJECT_CANISTER_COUNT_MEMORY_ID)
}
