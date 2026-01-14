use crate::data::{memory::Memory, Canister, Uuid};
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CanisterMemory = BTreeMap<Uuid, Canister, Memory>;
pub type CanisterUserIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_canisters() -> CanisterMemory {
    CanisterMemory::init(get_canisters_memory())
}

pub fn init_canister_user_index() -> CanisterUserIndexMemory {
    CanisterUserIndexMemory::init(get_canister_user_index_memory())
}

fn get_canisters_memory() -> Memory {
    super::MEMORY_MANAGER.with(|m| m.borrow().get(super::CANISTERS_MEMORY_ID))
}

fn get_canister_user_index_memory() -> Memory {
    super::MEMORY_MANAGER.with(|m| m.borrow().get(super::CANISTER_USER_INDEX_MEMORY_ID))
}
