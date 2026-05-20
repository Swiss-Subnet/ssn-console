use crate::data::{
    memory::{
        get_memory, Memory, CANISTER_ABSOLUTE_USAGE_MEMORY_ID,
        CANISTER_MONTH_PROJECT_INDEX_MEMORY_ID, CANISTER_USAGE_MEMORY_ID, PROJECT_USAGE_MEMORY_ID,
    },
    BillingMonth, Usage,
};
use candid::Principal;
use canister_utils::Uuid;
use ic_stable_structures::StableBTreeMap;

pub type CanisterUsageMemory = StableBTreeMap<(Uuid, BillingMonth, Principal), Usage, Memory>;
pub type ProjectUsageMemory = StableBTreeMap<(Uuid, BillingMonth), Usage, Memory>;
pub type CanisterMonthProjectIndexMemory = StableBTreeMap<(Principal, BillingMonth), Uuid, Memory>;
pub type CanisterAbsoluteUsageMemory = StableBTreeMap<(Principal, BillingMonth), Usage, Memory>;

pub fn init_canister_usage() -> CanisterUsageMemory {
    CanisterUsageMemory::init(get_memory(CANISTER_USAGE_MEMORY_ID))
}

pub fn init_project_usage() -> ProjectUsageMemory {
    ProjectUsageMemory::init(get_memory(PROJECT_USAGE_MEMORY_ID))
}

pub fn init_canister_month_project_index() -> CanisterMonthProjectIndexMemory {
    CanisterMonthProjectIndexMemory::init(get_memory(CANISTER_MONTH_PROJECT_INDEX_MEMORY_ID))
}

pub fn init_canister_absolute_usage() -> CanisterAbsoluteUsageMemory {
    CanisterAbsoluteUsageMemory::init(get_memory(CANISTER_ABSOLUTE_USAGE_MEMORY_ID))
}
