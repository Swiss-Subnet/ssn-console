use crate::data::memory::{
    get_memory, Memory, ORPHANED_CANISTER_CHILD_PARENT_INDEX_MEMORY_ID,
    ORPHANED_CANISTER_PARENT_CHILD_INDEX_MEMORY_ID,
};
use candid::Principal;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type OrphanedCanisterChildParentIndexMemory = BTreeMap<Principal, Principal, Memory>;
pub type OrphanedCanisterParentChildIndexMemory = BTreeSet<(Principal, Principal), Memory>;

pub fn init_orphaned_canister_child_parent_index() -> OrphanedCanisterChildParentIndexMemory {
    OrphanedCanisterChildParentIndexMemory::init(get_orphaned_canister_child_parent_memory())
}

pub fn init_orphaned_canister_parent_child_index() -> OrphanedCanisterParentChildIndexMemory {
    OrphanedCanisterParentChildIndexMemory::init(get_orphaned_canister_parent_child_memory())
}

fn get_orphaned_canister_child_parent_memory() -> Memory {
    get_memory(ORPHANED_CANISTER_CHILD_PARENT_INDEX_MEMORY_ID)
}

fn get_orphaned_canister_parent_child_memory() -> Memory {
    get_memory(ORPHANED_CANISTER_PARENT_CHILD_INDEX_MEMORY_ID)
}
