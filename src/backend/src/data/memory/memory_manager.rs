use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::DefaultMemoryImpl;
use ic_stable_structures::Memory as _;
use std::cell::RefCell;

pub(super) type Memory = VirtualMemory<DefaultMemoryImpl>;

// WASM page size; the stable memory manager allocates in these units.
const WASM_PAGE_SIZE_BYTES: u64 = 65_536;

pub struct MemoryRegionMetric {
    pub name: &'static str,
    pub memory_id: u8,
    pub pages: u64,
    pub bytes: u64,
}

// Single source of truth for every memory id the canister has ever
// allocated. Order is `REGIONS[N] == (name, id where id == N as u8)`;
// retired slots stay in place so their backing pages remain visible
// to operators and so the typed constants below keep referring to the
// same physical id.
//
// Append-only. Adding a row is the only place a new memory id is
// declared — the typed `*_MEMORY_ID` constants below read their value
// from this table at compile time.
const REGIONS: &[(&str, u8)] = &[
    ("user_profiles", 0),
    ("user_profile_principal_index", 1),
    ("user_profile_id_principal_index", 2),
    ("canisters", 3),
    ("active_project_canister_index", 4),
    ("trusted_partners", 5),
    ("trusted_partner_principal_index", 6),
    ("user_stats", 7),
    ("terms_and_conditions", 8),
    ("terms_and_conditions_created_at_index", 9),
    ("terms_and_conditions_decisions", 10),
    ("terms_and_conditions_decisions_user_index", 11),
    ("organizations", 12),
    ("organization_user_index", 13),
    ("user_organization_index", 14),
    ("teams", 15),
    ("team_user_index", 16),
    ("user_team_index", 17),
    ("organization_team_index", 18),
    ("projects", 19),
    ("project_team_index", 20),
    // 21 was TEAM_PROJECT_INDEX, replaced by TEAM_PROJECT_PERMISSIONS_INDEX (33).
    // The backing stable memory page is still allocated (IC memory manager does
    // not reclaim pages), but the slot is not reused.
    ("retired_team_project_index", 21),
    ("organization_project_index", 22),
    ("approval_policies", 23),
    ("project_operation_type_approval_policy_index", 24),
    ("proposals", 25),
    ("project_proposals_index", 26),
    ("canister_project_index", 27),
    ("invites", 28),
    ("organization_invite_index", 29),
    ("invite_status_index", 30),
    ("organization_team_permissions_index", 31),
    ("project_team_permissions_index", 32),
    ("team_project_permissions_index", 33),
    ("deleted_project_canister_index", 34),
    ("billing_plans", 35),
    ("orphaned_canister_child_parent_index", 36),
    ("orphaned_canister_parent_child_index", 37),
    ("principal_canister_index", 38),
    ("user_principal_names", 39),
    ("user_profile_verified_email_index", 40),
    ("canister_usage", 41),
    ("project_usage", 42),
    ("canister_month_project_index", 43),
    ("canister_absolute_usage", 44),
    ("service_principal_permissions", 45),
];

// Compile-time invariant: REGIONS is indexed by id. `REGIONS[N].1 == N`.
// If this fires, REGIONS was reordered or a row was inserted in the middle
// — both silently change the meaning of every typed constant below.
const _: () = {
    let mut i = 0;
    while i < REGIONS.len() {
        assert!(
            REGIONS[i].1 as usize == i,
            "REGIONS must be indexed by id; row at index N must have id == N",
        );
        i += 1;
    }
};

// Read the typed handle for a region by index into REGIONS. Keeps the
// `*_MEMORY_ID` constants below as one-line declarations whose id is
// not duplicated.
const fn region(index: usize) -> MemoryId {
    MemoryId::new(REGIONS[index].1)
}

pub(super) const USER_PROFILES_MEMORY_ID: MemoryId = region(0);
pub(super) const USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = region(1);
pub(super) const USER_PROFILE_ID_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = region(2);

pub(super) const CANISTERS_MEMORY_ID: MemoryId = region(3);
pub(super) const ACTIVE_PROJECT_CANISTER_INDEX_MEMORY_ID: MemoryId = region(4);

pub(super) const TRUSTED_PARTNERS_MEMORY_ID: MemoryId = region(5);
pub(super) const TRUSTED_PARTNER_PRINCIPAL_INDEX_MEMORY_ID: MemoryId = region(6);

pub(super) const USER_STATS_MEMORY_ID: MemoryId = region(7);

pub(super) const TERMS_AND_CONDITIONS_MEMORY_ID: MemoryId = region(8);
pub(super) const TERMS_AND_CONDITIONS_CREATED_AT_INDEX_MEMORY_ID: MemoryId = region(9);

pub(super) const TERMS_AND_CONDITIONS_DECISION_MEMORY_ID: MemoryId = region(10);
pub(super) const TERMS_AND_CONDITIONS_DECISION_USER_INDEX_MEMORY_ID: MemoryId = region(11);

pub(super) const ORGANIZATION_MEMORY_ID: MemoryId = region(12);
pub(super) const ORGANIZATION_USER_INDEX_MEMORY_ID: MemoryId = region(13);
pub(super) const USER_ORGANIZATION_INDEX_MEMORY_ID: MemoryId = region(14);

pub(super) const TEAM_MEMORY_ID: MemoryId = region(15);
pub(super) const TEAM_USER_INDEX_MEMORY_ID: MemoryId = region(16);
pub(super) const USER_TEAM_INDEX_MEMORY_ID: MemoryId = region(17);
pub(super) const ORGANIZATION_TEAM_INDEX_MEMORY_ID: MemoryId = region(18);

pub(super) const PROJECT_MEMORY_ID: MemoryId = region(19);
pub(super) const PROJECT_TEAM_INDEX_MEMORY_ID: MemoryId = region(20);
// 21 is the retired TEAM_PROJECT_INDEX slot; no typed handle.
pub(super) const ORGANIZATION_PROJECT_INDEX_MEMORY_ID: MemoryId = region(22);

pub(super) const APPROVAL_POLICY_MEMORY_ID: MemoryId = region(23);
pub(super) const PROJECT_OPERATION_TYPE_APPROVAL_POLICY_INDEX_MEMORY_ID: MemoryId = region(24);

pub(super) const PROPOSAL_MEMORY_ID: MemoryId = region(25);
pub(super) const PROJECT_PROPOSAL_INDEX_MEMORY_ID: MemoryId = region(26);

pub(super) const CANISTER_PROJECT_INDEX_MEMORY_ID: MemoryId = region(27);

pub(super) const ORG_INVITE_MEMORY_ID: MemoryId = region(28);
pub(super) const ORGANIZATION_INVITE_INDEX_MEMORY_ID: MemoryId = region(29);
pub(super) const INVITE_STATUS_INDEX_MEMORY_ID: MemoryId = region(30);

pub(super) const ORGANIZATION_TEAM_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = region(31);
pub(super) const PROJECT_TEAM_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = region(32);
pub(super) const TEAM_PROJECT_PERMISSIONS_INDEX_MEMORY_ID: MemoryId = region(33);

pub(super) const DELETED_PROJECT_CANISTER_INDEX_MEMORY_ID: MemoryId = region(34);

pub(super) const ORGANIZATION_BILLING_PLAN_MEMORY_ID: MemoryId = region(35);

pub(super) const ORPHANED_CANISTER_CHILD_PARENT_INDEX_MEMORY_ID: MemoryId = region(36);
pub(super) const ORPHANED_CANISTER_PARENT_CHILD_INDEX_MEMORY_ID: MemoryId = region(37);
pub(super) const PRINCIPAL_CANISTER_INDEX_MEMORY_ID: MemoryId = region(38);

pub(super) const USER_PRINCIPAL_NAME_MEMORY_ID: MemoryId = region(39);
pub(super) const USER_PROFILE_VERIFIED_EMAIL_INDEX_MEMORY_ID: MemoryId = region(40);

pub(super) const CANISTER_USAGE_MEMORY_ID: MemoryId = region(41);
pub(super) const PROJECT_USAGE_MEMORY_ID: MemoryId = region(42);
pub(super) const CANISTER_MONTH_PROJECT_INDEX_MEMORY_ID: MemoryId = region(43);
pub(super) const CANISTER_ABSOLUTE_USAGE_MEMORY_ID: MemoryId = region(44);

pub(super) const SERVICE_PRINCIPAL_PERMISSIONS_MEMORY_ID: MemoryId = region(45);

// Returns a size snapshot for every memory id in REGIONS.
pub fn memory_metrics() -> Vec<MemoryRegionMetric> {
    REGIONS
        .iter()
        .map(|(name, id)| {
            let pages = get_memory(MemoryId::new(*id)).size();
            MemoryRegionMetric {
                name,
                memory_id: *id,
                pages,
                bytes: pages.saturating_mul(WASM_PAGE_SIZE_BYTES),
            }
        })
        .collect()
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

pub(super) fn get_memory(id: MemoryId) -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(id))
}
