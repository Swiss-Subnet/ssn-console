use crate::{
    memory_manager::{
        get_memory, Memory, CANISTER_CHANGE_MEMORY_ID,
        CANISTER_ID_TIMESTAMP_CHANGE_INDEX_MEMORY_ID, CANISTER_INFO_MEMORY_ID,
        FAILED_CANISTER_MAPPINGS_MEMORY_ID, ORIGIN_TIMESTAMP_CHANGE_INDEX_MEMORY_ID,
        SUBNET_CANISTER_RANGES_MEMORY_ID,
    },
    model::{CanisterChange, CanisterChangeInfo, FailedCanisterMapping, SubnetCanisterRangeInfo},
};
use candid::Principal;
use canister_utils::Uuid;
use ic_stable_structures::BTreeMap;

pub type SubnetCanisterRangeInfoMemory =
    ic_stable_structures::Cell<SubnetCanisterRangeInfo, Memory>;
pub type CanisterInfoMemory = BTreeMap<Principal, CanisterChangeInfo, Memory>;
pub type CanisterChangeMemory = BTreeMap<Uuid, CanisterChange, Memory>;
pub type CanisterIdTimestampChangeIndexMemory = BTreeMap<(Principal, u64, Uuid), (), Memory>;
pub type OriginTimestampChangeIndexMemory = BTreeMap<(Principal, u64, Uuid), (), Memory>;
pub type FailedCanisterMappingsMemory = BTreeMap<Uuid, FailedCanisterMapping, Memory>;

pub fn init_subnet_canister_range_info() -> SubnetCanisterRangeInfoMemory {
    SubnetCanisterRangeInfoMemory::init(
        get_subnet_canister_range_info_memory(),
        SubnetCanisterRangeInfo {
            canister_ranges: vec![],
        },
    )
}

pub fn init_canister_infos() -> CanisterInfoMemory {
    CanisterInfoMemory::init(get_canister_info_memory())
}

pub fn init_canister_changes() -> CanisterChangeMemory {
    CanisterChangeMemory::init(get_canister_change_memory())
}

pub fn init_canister_id_timestamp_change_index() -> CanisterIdTimestampChangeIndexMemory {
    CanisterIdTimestampChangeIndexMemory::init(get_canister_id_change_index_memory())
}

pub fn init_origin_timestamp_change_index() -> OriginTimestampChangeIndexMemory {
    OriginTimestampChangeIndexMemory::init(get_origin_timestamp_change_index_memory())
}

pub fn init_failed_canister_mappings() -> FailedCanisterMappingsMemory {
    FailedCanisterMappingsMemory::init(get_failed_canister_mappings_memory())
}

fn get_subnet_canister_range_info_memory() -> Memory {
    get_memory(SUBNET_CANISTER_RANGES_MEMORY_ID)
}

fn get_canister_info_memory() -> Memory {
    get_memory(CANISTER_INFO_MEMORY_ID)
}

fn get_canister_change_memory() -> Memory {
    get_memory(CANISTER_CHANGE_MEMORY_ID)
}

fn get_canister_id_change_index_memory() -> Memory {
    get_memory(CANISTER_ID_TIMESTAMP_CHANGE_INDEX_MEMORY_ID)
}

fn get_origin_timestamp_change_index_memory() -> Memory {
    get_memory(ORIGIN_TIMESTAMP_CHANGE_INDEX_MEMORY_ID)
}

fn get_failed_canister_mappings_memory() -> Memory {
    get_memory(FAILED_CANISTER_MAPPINGS_MEMORY_ID)
}
