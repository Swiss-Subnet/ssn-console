use crate::{
    constants::TARGET_RETENTION_PERIOD_NANOS,
    dto,
    memory::{
        init_canister_timestamps_index, init_cycles_metrics_snapshots,
        init_latest_cycles_metrics_snapshots, CanisterTimestampsIndexMemory,
        CyclesMetricsSnapshotMemory, LatestCyclesMetricsSnapshotMemory,
    },
    model::CyclesMetricsSnapshot,
};
use candid::{Nat, Principal};
use std::{cell::RefCell, ops::Bound};

pub fn insert_snapshot(timestamp_ns: u64, canister_id: Principal, snapshot: CyclesMetricsSnapshot) {
    mutate_state(|s| {
        let key = (timestamp_ns, canister_id);

        if s.cycles_metrics_snapshots.contains_key(&key) {
            ic_cdk::println!(
                "Warning: Snapshot for canister {} at timestamp {} already exists, overwriting",
                canister_id,
                timestamp_ns
            );
        }

        if let Some(cutoff) = timestamp_ns.checked_sub(TARGET_RETENTION_PERIOD_NANOS) {
            let stale_snapshots = s
                .canister_timestamps_index
                .range((canister_id, 0)..=(canister_id, cutoff))
                .collect::<Vec<_>>();

            for (canister_id, timestamp_ns) in stale_snapshots {
                s.cycles_metrics_snapshots
                    .remove(&(timestamp_ns, canister_id));
                s.canister_timestamps_index
                    .remove(&(canister_id, timestamp_ns));
            }
        }

        s.cycles_metrics_snapshots.insert(key, snapshot.clone());
        s.canister_timestamps_index
            .insert((canister_id, timestamp_ns));
        s.latest_cycles_metrics_snapshots
            .insert(canister_id, snapshot);
    });
}

pub fn list_snapshots_after(
    cursor: Option<dto::Cursor>,
    limit: usize,
) -> (Vec<dto::CyclesMetricsSnapshotDto>, Option<dto::Cursor>) {
    with_state(|s| {
        let start_bound = match cursor {
            Some(c) => Bound::Excluded((c.0, c.1)),
            None => Bound::Unbounded,
        };

        let iter = s
            .cycles_metrics_snapshots
            .range((start_bound, Bound::Unbounded))
            .take(limit + 1) // Take `limit + 1` to check if there are more pages
            .map(|val| val.into_pair());

        let mut last_key = None;
        let mut snapshots = Vec::with_capacity(limit);

        for (key, snapshot) in iter {
            if snapshots.len() < limit {
                last_key = Some(dto::Cursor(key.0, key.1));
                snapshots.push(dto::CyclesMetricsSnapshotDto {
                    timestamp_ns: key.0,
                    canister_id: key.1,
                    memory: Nat::from(snapshot.memory),
                    compute_allocation: Nat::from(snapshot.compute_allocation),
                    ingress_induction: Nat::from(snapshot.ingress_induction),
                    instructions: Nat::from(snapshot.instructions),
                    request_and_response_transmission: Nat::from(
                        snapshot.request_and_response_transmission,
                    ),
                    uninstall: Nat::from(snapshot.uninstall),
                    http_outcalls: Nat::from(snapshot.http_outcalls),
                    burned_cycles: Nat::from(snapshot.burned_cycles),
                });
            } else {
                // Hitting limit + 1 means there are more pages.
                // We return `last_key` which is the key of the last item in `snapshots`.
                return (snapshots, last_key);
            }
        }

        // Exiting the loop means that are no more pages
        (snapshots, None)
    })
}

pub fn get_latest_snapshot(canister_id: Principal) -> Option<CyclesMetricsSnapshot> {
    with_state(|s| s.latest_cycles_metrics_snapshots.get(&canister_id))
}

struct CyclesMonitorState {
    cycles_metrics_snapshots: CyclesMetricsSnapshotMemory,
    canister_timestamps_index: CanisterTimestampsIndexMemory,
    latest_cycles_metrics_snapshots: LatestCyclesMetricsSnapshotMemory,
}

impl Default for CyclesMonitorState {
    fn default() -> Self {
        Self {
            cycles_metrics_snapshots: init_cycles_metrics_snapshots(),
            canister_timestamps_index: init_canister_timestamps_index(),
            latest_cycles_metrics_snapshots: init_latest_cycles_metrics_snapshots(),
        }
    }
}

thread_local! {
    static STATE: RefCell<CyclesMonitorState> = RefCell::new(CyclesMonitorState::default());
}

fn with_state<R>(f: impl FnOnce(&CyclesMonitorState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut CyclesMonitorState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;
    use canister_utils::CanisterId;

    fn clear_state() {
        mutate_state(|s| {
            s.cycles_metrics_snapshots = init_cycles_metrics_snapshots();
            s.canister_timestamps_index = init_canister_timestamps_index();
            s.latest_cycles_metrics_snapshots = init_latest_cycles_metrics_snapshots();
        });
    }

    fn create_snapshot(base: u64) -> CyclesMetricsSnapshot {
        let b = base as u128;
        CyclesMetricsSnapshot {
            memory: b,
            compute_allocation: b,
            ingress_induction: b,
            instructions: b,
            request_and_response_transmission: b,
            uninstall: b,
            http_outcalls: b,
            burned_cycles: b,
        }
    }

    #[test]
    fn test_list_snapshots_after_pagination() {
        clear_state();
        let principal_one = CanisterId::from(1).into();
        let principal_two = CanisterId::from(2).into();

        for i in 1..=5 {
            insert_snapshot(i, principal_one, create_snapshot(i));
            insert_snapshot(i, principal_two, create_snapshot(i));
        }

        // Ordering: (1, p1), (1, p2), (2, p1)
        let (page_one, next_cursor_one) = list_snapshots_after(None, 3);
        assert_eq!(page_one.len(), 3);
        assert!(next_cursor_one.is_some());
        let expected_next_cursor = dto::Cursor(2, principal_one);
        assert_eq!(next_cursor_one.unwrap(), expected_next_cursor);
        assert_eq!(
            page_one.last().unwrap().timestamp_ns,
            expected_next_cursor.0
        );
        assert_eq!(page_one.last().unwrap().canister_id, expected_next_cursor.1);

        // Ordering: (2, p2), (3, p1), (3, p2)
        let (page_two, next_cursor_two) = list_snapshots_after(next_cursor_one, 3);
        assert_eq!(page_two.len(), 3);
        assert!(next_cursor_two.is_some());
        let expected_next_cursor_two = dto::Cursor(3, principal_two);
        assert_eq!(next_cursor_two.unwrap(), expected_next_cursor_two);
        assert_eq!(
            page_two.last().unwrap().timestamp_ns,
            expected_next_cursor_two.0
        );
        assert_eq!(
            page_two.last().unwrap().canister_id,
            expected_next_cursor_two.1
        );

        // Ordering: (4, c1), (4, c2), (5, c1), (5, c2)
        let (page3, next_cursor_3) = list_snapshots_after(next_cursor_two, 10);
        assert_eq!(page3.len(), 4);
        assert!(next_cursor_3.is_none());
    }

    #[test]
    fn test_get_latest_snapshot() {
        clear_state();
        let canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();

        assert!(get_latest_snapshot(canister_id).is_none());

        insert_snapshot(1, canister_id, create_snapshot(1));
        assert_eq!(get_latest_snapshot(canister_id).unwrap().memory, 1);

        insert_snapshot(5, canister_id, create_snapshot(5));
        assert_eq!(get_latest_snapshot(canister_id).unwrap().memory, 5);
    }
}
