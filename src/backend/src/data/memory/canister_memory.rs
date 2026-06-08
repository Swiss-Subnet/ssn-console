use crate::data::{
    memory::{
        get_memory, Memory, ACTIVE_PROJECT_CANISTER_INDEX_MEMORY_ID, CANISTERS_MEMORY_ID,
        CANISTER_PROJECT_INDEX_MEMORY_ID, DELETED_PROJECT_CANISTER_INDEX_MEMORY_ID,
        PRINCIPAL_CANISTER_INDEX_MEMORY_ID,
    },
    Canister, CanisterId, ProjectId,
};
use candid::Principal;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CanisterMemory = BTreeMap<CanisterId, Canister, Memory>;
pub type ActiveProjectCanisterIndexMemory = BTreeSet<(ProjectId, CanisterId), Memory>;
pub type DeletedProjectCanisterIndexMemory = BTreeSet<(ProjectId, CanisterId), Memory>;
pub type CanisterProjectIndexMemory = BTreeMap<CanisterId, ProjectId, Memory>;
pub type PrincipalCanisterIndexMemory = BTreeMap<Principal, CanisterId, Memory>;

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

pub fn init_principal_canister_index() -> PrincipalCanisterIndexMemory {
    PrincipalCanisterIndexMemory::init(get_principal_canister_index_memory())
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

fn get_principal_canister_index_memory() -> Memory {
    get_memory(PRINCIPAL_CANISTER_INDEX_MEMORY_ID)
}
