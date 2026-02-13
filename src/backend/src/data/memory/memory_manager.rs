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

pub(super) const USER_PROFILES_MEMORY_ID: MemoryId = MemoryId::new(0);
pub(super) const USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = MemoryId::new(1);
pub(super) const USER_PROFILE_ID_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = MemoryId::new(2);

pub(super) const CANISTERS_MEMORY_ID: MemoryId = MemoryId::new(3);
pub(super) const CANISTER_USER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(4);

pub(super) const TRUSTED_PARTNERS_MEMORY_ID: MemoryId = MemoryId::new(5);
pub(super) const TRUSTED_PARTNER_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = MemoryId::new(6);

pub(super) const USER_STATS_MEMORY_ID: MemoryId = MemoryId::new(7);

pub(super) const TERMS_AND_CONDITIONS_MEMORY_ID: MemoryId = MemoryId::new(8);
pub(super) const TERMS_AND_CONDITIONS_CREATED_AT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(9);

pub(super) const TERMS_AND_CONDITIONS_DECISION_MEMORY_ID: MemoryId = MemoryId::new(10);
pub(super) const TERMS_AND_CONDITIONS_DECISION_USER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(11);

pub(super) const ORGANIZATION_MEMORY_ID: MemoryId = MemoryId::new(12);
pub(super) const ORGANIZATION_USER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(13);
pub(super) const USER_ORGANIZATION_INDEX_MEMORY_ID: MemoryId = MemoryId::new(14);

pub(super) const TEAM_MEMORY_ID: MemoryId = MemoryId::new(15);
pub(super) const TEAM_USER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(16);
pub(super) const USER_TEAM_INDEX_MEMORY_ID: MemoryId = MemoryId::new(17);
pub(super) const ORGANIZATION_TEAM_INDEX_MEMORY_ID: MemoryId = MemoryId::new(18);

pub(super) const PROJECT_MEMORY_ID: MemoryId = MemoryId::new(19);
pub(super) const PROJECT_TEAM_INDEX_MEMORY_ID: MemoryId = MemoryId::new(20);
pub(super) const TEAM_PROJECT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(21);
pub(super) const ORGANIZATION_PROJECT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(22);
