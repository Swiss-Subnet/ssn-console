use crate::data::{
    memory::{get_memory, Memory, CANISTER_USAGE_MEMORY_ID, PROJECT_USAGE_MEMORY_ID},
    BillingMonth, CanisterUsage, ProjectUsage,
};
use candid::Principal;
use canister_utils::Uuid;
use ic_stable_structures::StableBTreeMap;

pub type CanisterUsageMemory = StableBTreeMap<(Principal, BillingMonth), CanisterUsage, Memory>;
pub type ProjectUsageMemory = StableBTreeMap<(Uuid, BillingMonth), ProjectUsage, Memory>;

pub fn init_canister_usage() -> CanisterUsageMemory {
    CanisterUsageMemory::init(get_memory(CANISTER_USAGE_MEMORY_ID))
}

pub fn init_project_usage() -> ProjectUsageMemory {
    ProjectUsageMemory::init(get_memory(PROJECT_USAGE_MEMORY_ID))
}
