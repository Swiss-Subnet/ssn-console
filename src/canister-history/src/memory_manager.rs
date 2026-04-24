use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::DefaultMemoryImpl;
use std::cell::RefCell;

pub(super) type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

pub(super) fn get_memory(id: MemoryId) -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(id))
}

pub(super) const SUBNET_CANISTER_RANGES_MEMORY_ID: MemoryId = MemoryId::new(1);
pub(super) const CANISTER_INFO_MEMORY_ID: MemoryId = MemoryId::new(2);
pub(super) const CANISTER_CHANGE_MEMORY_ID: MemoryId = MemoryId::new(3);
pub(super) const CANISTER_ID_TIMESTAMP_CHANGE_INDEX_MEMORY_ID: MemoryId = MemoryId::new(4);
pub(super) const ORIGIN_TIMESTAMP_CHANGE_INDEX_MEMORY_ID: MemoryId = MemoryId::new(5);
pub(super) const FAILED_CANISTER_MAPPINGS_MEMORY_ID: MemoryId = MemoryId::new(6);
