use crate::{
    canister_id::CanisterId,
    constants::{MAX_TIME_BETWEEN_SYNCS_NANOS, MIN_TIME_BETWEEN_SYNCS_NANOS},
    dto::{
        ListCanisterChangesRequest, ListCanisterChangesResponse, ListSubnetCanisterIdsRequest,
        ListSubnetCanisterIdsResponse, ListSubnetCanisterRangesRequest,
        ListSubnetCanisterRangesResponse, TriggerSyncCanisterHistoriesRequest,
        TriggerSyncCanisterHistoriesResponse, UpdateSubnetCanisterRangesRequest,
        UpdateSubnetCanisterRangesResponse,
    },
    service,
};
use canister_utils::{assert_controller, ApiError, ApiResultDto};
use ic_cdk::{api::msg_caller, futures::spawn, *};
use ic_cdk_timers::{clear_timer, set_timer, TimerId};
use std::{cell::Cell, time::Duration};

thread_local! {
    static TIMERS: Cell<Option<TimerId>> = const { Cell::new(None) };
    static IS_SYNC_RUNNING: Cell<bool> = const { Cell::new(false) };
}

#[init]
fn init() {
    setup_timers();
}

#[post_upgrade]
fn post_upgrade() {
    setup_timers();
}

fn setup_timers() {
    let timer_id = set_timer(Duration::from_nanos(0), async {
        sync_canister_histories().await;
    });
    TIMERS.with(|t| t.set(Some(timer_id)));
}

async fn sync_canister_histories() {
    if IS_SYNC_RUNNING.with(|f| f.replace(true)) {
        ic_cdk::println!("Sync already in progress; skipping this run.");
        return;
    }

    // RAII guard to ensure the running flag is cleared even on panic/early return.
    struct SyncRunGuard;
    impl Drop for SyncRunGuard {
        fn drop(&mut self) {
            IS_SYNC_RUNNING.with(|f| {
                f.set(false);
            });
        }
    }
    let _guard = SyncRunGuard;

    let current_time_nanos = ic_cdk::api::time();
    if let Err(err) = service::sync_canister_histories().await {
        ic_cdk::println!("Failed to perform canister history sync: {err:?}");
    }
    let end_time_nanos = ic_cdk::api::time();
    let time_diff_nanos = end_time_nanos.saturating_sub(current_time_nanos);

    let next_run_nanos = MAX_TIME_BETWEEN_SYNCS_NANOS
        .saturating_sub(time_diff_nanos)
        .max(MIN_TIME_BETWEEN_SYNCS_NANOS);

    let timer_id = set_timer(Duration::from_nanos(next_run_nanos), async {
        sync_canister_histories().await;
    });
    TIMERS.with(|t| t.set(Some(timer_id)));
}

#[update]
fn trigger_sync_canister_histories(
    _req: TriggerSyncCanisterHistoriesRequest,
) -> ApiResultDto<TriggerSyncCanisterHistoriesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    if IS_SYNC_RUNNING.with(|f| f.get()) {
        return ApiResultDto::Ok(crate::dto::TriggerSyncCanisterHistoriesResponse {
            message: "Sync is already in progress. No new sync was triggered.".to_string(),
        });
    }

    TIMERS.with(|t| {
        if let Some(id) = t.replace(None) {
            clear_timer(id);
        }
    });

    spawn(async move {
        sync_canister_histories().await;
    });

    ApiResultDto::Ok(crate::dto::TriggerSyncCanisterHistoriesResponse {
        message: "Sync triggered successfully.".to_string(),
    })
}

#[update]
fn update_subnet_canister_ranges(
    request: UpdateSubnetCanisterRangesRequest,
) -> ApiResultDto<UpdateSubnetCanisterRangesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    for (i, range) in request.canister_ranges.iter().enumerate() {
        if let Err(err) = CanisterId::try_from(range.0) {
            return ApiResultDto::Err(ApiError::client_error(format!(
                "The start principal of the {i}th provided subnet range is invalid: {err}"
            )));
        }

        if let Err(err) = CanisterId::try_from(range.1) {
            return ApiResultDto::Err(ApiError::client_error(format!(
                "The end principal of the {i}th provided subnet range is invalid: {err}"
            )));
        }
    }

    service::update_subnet_canister_ranges(request);
    ApiResultDto::Ok(UpdateSubnetCanisterRangesResponse {})
}

#[query]
fn list_subnet_canister_ranges(
    _req: ListSubnetCanisterRangesRequest,
) -> ApiResultDto<ListSubnetCanisterRangesResponse> {
    ApiResultDto::Ok(service::list_subnet_canister_ranges())
}

#[query]
fn list_subnet_canister_ids(
    req: ListSubnetCanisterIdsRequest,
) -> ApiResultDto<ListSubnetCanisterIdsResponse> {
    ApiResultDto::Ok(service::list_subnet_canister_ids(req))
}

#[query]
fn list_canister_changes(
    req: ListCanisterChangesRequest,
) -> ApiResultDto<ListCanisterChangesResponse> {
    ApiResultDto::Ok(service::list_canister_changes(req))
}
