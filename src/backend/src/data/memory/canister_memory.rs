use crate::data::{
    memory::{
        get_memory, Memory, ACTIVE_PROJECT_CANISTER_INDEX_MEMORY_ID, CANISTERS_MEMORY_ID,
        CANISTER_PROJECT_INDEX_MEMORY_ID, DELETED_PROJECT_CANISTER_INDEX_MEMORY_ID,
    },
    Canister,
};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CanisterMemory = BTreeMap<Uuid, Canister, Memory>;
pub type ActiveProjectCanisterIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type DeletedProjectCanisterIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type CanisterProjectIndexMemory = BTreeMap<Uuid, Uuid, Memory>;

pub fn init_canisters() -> CanisterMemory {
    CanisterMemory::init(get_canisters_memory())
}

pub fn init_active_project_canister_index() -> ActiveProjectCanisterIndexMemory {
    ActiveProjectCanisterIndexMemory::init(get_active_project_canister_index_memory())
}

pub fn init_deleted_project_canister_index() -> DeletedProjectCanisterIndexMemory {
    DeletedProjectCanisterIndexMemory::init(get_deleted_project_canister_index_memory())
}

pub fn init_canister_project_index() -> CanisterProjectIndexMemory {
    CanisterProjectIndexMemory::init(get_canister_project_index_memory())
}

fn get_canisters_memory() -> Memory {
    get_memory(CANISTERS_MEMORY_ID)
}

fn get_active_project_canister_index_memory() -> Memory {
    get_memory(ACTIVE_PROJECT_CANISTER_INDEX_MEMORY_ID)
}

fn get_deleted_project_canister_index_memory() -> Memory {
    get_memory(DELETED_PROJECT_CANISTER_INDEX_MEMORY_ID)
}

fn get_canister_project_index_memory() -> Memory {
    get_memory(CANISTER_PROJECT_INDEX_MEMORY_ID)
}
