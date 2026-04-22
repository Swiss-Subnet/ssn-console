use crate::{
    memory_manager::{
        get_memory, Memory, CANISTER_TIMESTAMP_INDEX_MEMORY_ID, CYCLES_METRICS_SNAPSHOTS_MEMORY_ID,
        LATEST_CYCLES_METRICS_SNAPSHOTS_MEMORY_ID,
    },
    model::CyclesMetricsSnapshot,
};
use candid::Principal;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type CyclesMetricsSnapshotMemory = BTreeMap<(u64, Principal), CyclesMetricsSnapshot, Memory>;
pub type CanisterTimestampsIndexMemory = BTreeSet<(Principal, u64), Memory>;
pub type LatestCyclesMetricsSnapshotMemory = BTreeMap<Principal, CyclesMetricsSnapshot, Memory>;

pub fn init_cycles_metrics_snapshots() -> CyclesMetricsSnapshotMemory {
    CyclesMetricsSnapshotMemory::init(get_cycles_metrics_snapshots_memory())
}

pub fn init_canister_timestamps_index() -> CanisterTimestampsIndexMemory {
    CanisterTimestampsIndexMemory::init(get_canister_timestamps_index_memory())
}

pub fn init_latest_cycles_metrics_snapshots() -> LatestCyclesMetricsSnapshotMemory {
    LatestCyclesMetricsSnapshotMemory::init(get_latest_cycles_metrics_snapshots_memory())
}

fn get_cycles_metrics_snapshots_memory() -> Memory {
    get_memory(CYCLES_METRICS_SNAPSHOTS_MEMORY_ID)
}

fn get_canister_timestamps_index_memory() -> Memory {
    get_memory(CANISTER_TIMESTAMP_INDEX_MEMORY_ID)
}

fn get_latest_cycles_metrics_snapshots_memory() -> Memory {
    get_memory(LATEST_CYCLES_METRICS_SNAPSHOTS_MEMORY_ID)
}
