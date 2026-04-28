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

pub(super) const CYCLES_METRICS_SNAPSHOTS_MEMORY_ID: MemoryId = MemoryId::new(0);
pub(super) const CANISTER_TIMESTAMP_INDEX_MEMORY_ID: MemoryId = MemoryId::new(1);
pub(super) const LATEST_CYCLES_METRICS_SNAPSHOTS_MEMORY_ID: MemoryId = MemoryId::new(2);
