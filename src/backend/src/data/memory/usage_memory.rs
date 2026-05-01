use crate::data::memory::get_memory;
use crate::data::memory::Memory;
use crate::data::memory::CANISTER_USAGE_MEMORY_ID;
use candid::Principal;
use ic_stable_structures::StableBTreeMap;

pub type CanisterUsageMemory = StableBTreeMap<(Principal, u32), crate::data::CanisterUsage, Memory>;

pub fn init_canister_usage() -> CanisterUsageMemory {
    CanisterUsageMemory::init(get_memory(CANISTER_USAGE_MEMORY_ID))
}
