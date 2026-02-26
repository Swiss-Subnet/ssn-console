use crate::{
    memory::{
        init_canister_changes, init_canister_id_timestamp_change_index, init_canister_infos,
        init_origin_timestamp_change_index, init_subnet_canister_range_info, CanisterChangeMemory,
        CanisterIdTimestampChangeIndexMemory, CanisterInfoMemory, OriginTimestampChangeIndexMemory,
        SubnetCanisterRangeInfoMemory,
    },
    model::{CanisterChange, CanisterChangeInfo, CanisterChangeOrigin, SubnetCanisterRangeInfo},
};
use candid::Principal;
use canister_utils::Uuid;
use either::Either;
use std::cell::RefCell;

pub fn update_subnet_canister_ranges(canister_ranges: Vec<(Principal, Principal)>) {
    mutate_state(|s| {
        s.subnet_canister_range_info
            .set(SubnetCanisterRangeInfo { canister_ranges })
    });
}

pub fn list_subnet_canister_ranges() -> Vec<(Principal, Principal)> {
    with_state(|s| s.subnet_canister_range_info.get().clone().canister_ranges)
}

pub fn insert_change(change: CanisterChange) -> Uuid {
    let id = Uuid::new();

    mutate_state(|s| {
        let origin = match change.origin {
            CanisterChangeOrigin::FromUser { user_id } => user_id,
            CanisterChangeOrigin::FromCanister {
                canister_id,
                canister_version: _,
            } => canister_id,
        };

        s.canister_changes.insert(id, change.clone());
        s.origin_timestamp_change_index
            .insert((origin, change.timestamp_nanos, id), ());
        s.canister_id_timestamp_change_index
            .insert((change.canister_id, change.timestamp_nanos, id), ());
    });

    id
}

pub fn get_subnet_canister_ids_count() -> u64 {
    with_state(|s| s.canister_infos.len())
}

pub fn list_subnet_canister_ids(limit: usize, page: usize) -> Vec<Principal> {
    with_state(|s| {
        s.canister_infos
            .keys()
            .skip(limit * (page - 1))
            .take(limit)
            .collect::<Vec<_>>()
    })
}

pub fn get_canister_changes_count(canister_id: Principal) -> u64 {
    with_state(|s| {
        s.canister_infos
            .get(&canister_id)
            .map(|info| info.stored_num_changes)
            .unwrap_or(0)
    })
}

pub fn list_canister_changes(
    canister_id: Principal,
    reverse: bool,
    limit: usize,
    page: usize,
) -> Vec<(Uuid, CanisterChange)> {
    with_state(|s| {
        let range_iter = s
            .canister_id_timestamp_change_index
            .range((canister_id, u64::MIN, Uuid::MIN)..=(canister_id, u64::MAX, Uuid::MAX));

        let iter = if reverse {
            Either::Left(range_iter.rev())
        } else {
            Either::Right(range_iter)
        };

        iter.map(|val| val.into_pair())
            .filter_map(|((_, _, id), _)| s.canister_changes.get(&id).map(|changes| (id, changes)))
            .skip(limit * (page - 1))
            .take(limit)
            .collect()
    })
}

pub fn get_canister_change_info(canister_id: Principal) -> Option<CanisterChangeInfo> {
    with_state(|s| s.canister_infos.get(&canister_id))
}

pub fn upsert_canister_change_info(canister_id: Principal, canister_info: CanisterChangeInfo) {
    mutate_state(|s| s.canister_infos.insert(canister_id, canister_info));
}

struct CanisterHistoryState {
    subnet_canister_range_info: SubnetCanisterRangeInfoMemory,
    canister_infos: CanisterInfoMemory,
    canister_changes: CanisterChangeMemory,
    canister_id_timestamp_change_index: CanisterIdTimestampChangeIndexMemory,
    origin_timestamp_change_index: OriginTimestampChangeIndexMemory,
}

impl Default for CanisterHistoryState {
    fn default() -> Self {
        Self {
            subnet_canister_range_info: init_subnet_canister_range_info(),
            canister_infos: init_canister_infos(),
            canister_changes: init_canister_changes(),
            canister_id_timestamp_change_index: init_canister_id_timestamp_change_index(),
            origin_timestamp_change_index: init_origin_timestamp_change_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<CanisterHistoryState> = RefCell::new(CanisterHistoryState::default());
}

fn with_state<R>(f: impl FnOnce(&CanisterHistoryState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut CanisterHistoryState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
