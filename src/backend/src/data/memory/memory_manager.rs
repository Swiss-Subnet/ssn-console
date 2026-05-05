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
pub(super) const ACTIVE_PROJECT_CANISTER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(4);

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
// 21 was TEAM_PROJECT_INDEX, replaced by TEAM_PROJECT_PERMISSIONS_INDEX (33).
// The backing stable memory page is still allocated (IC memory manager does
// not reclaim pages), but the slot is not reused.
pub(super) const ORGANIZATION_PROJECT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(22);

pub(super) const APPROVAL_POLICY_MEMORY_ID: MemoryId = MemoryId::new(23);
pub(super) const PROJECT_OPERATION_TYPE_APPROVAL_POLICY_INDEX_MEMORY_ID: MemoryId =
    MemoryId::new(24);

pub(super) const PROPOSAL_MEMORY_ID: MemoryId = MemoryId::new(25);
pub(super) const PROJECT_PROPOSAL_INDEX_MEMORY_ID: MemoryId = MemoryId::new(26);

pub(super) const CANISTER_PROJECT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(27);

pub(super) const ORG_INVITE_MEMORY_ID: MemoryId = MemoryId::new(28);
pub(super) const ORGANIZATION_INVITE_INDEX_MEMORY_ID: MemoryId = MemoryId::new(29);
pub(super) const INVITE_STATUS_INDEX_MEMORY_ID: MemoryId = MemoryId::new(30);

pub(super) const ORGANIZATION_TEAM_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = MemoryId::new(31);
pub(super) const PROJECT_TEAM_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = MemoryId::new(32);
pub(super) const TEAM_PROJECT_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = MemoryId::new(33);

pub(super) const DELETED_PROJECT_CANISTER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(34);

pub(super) const ORGANIZATION_BILLING_PLAN_MEMORY_ID: MemoryId = MemoryId::new(35);

pub(super) const ORPHANED_CANISTER_CHILD_PARENT_INDEX_MEMORY_ID: MemoryId = MemoryId::new(36);
pub(super) const ORPHANED_CANISTER_PARENT_CHILD_INDEX_MEMORY_ID: MemoryId = MemoryId::new(37);
pub(super) const PRINCIPAL_CANISTER_INDEX_MEMORY_ID: MemoryId = MemoryId::new(38);
