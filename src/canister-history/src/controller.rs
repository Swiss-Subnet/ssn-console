use crate::{
    canister_id::CanisterId,
    constants::{MAX_TIME_BETWEEN_SYNCS_NANOS, MIN_TIME_BETWEEN_SYNCS_NANOS},
    dto::{
        ListCanisterChangesRequest, ListCanisterChangesResponse, ListSubnetCanisterIdsRequest,
        ListSubnetCanisterIdsResponse, ListSubnetCanisterRangesRequest,
        ListSubnetCanisterRangesResponse, UpdateSubnetCanisterRangesRequest,
        UpdateSubnetCanisterRangesResponse,
    },
    service,
};
use canister_utils::{assert_controller, ApiError, ApiResultDto};
use ic_cdk::{api::msg_caller, *};
use ic_cdk_timers::set_timer;
use std::time::Duration;

#[init]
fn init() {
    setup_timers();
}

#[post_upgrade]
fn post_upgrade() {
    setup_timers();
}

fn setup_timers() {
    set_timer(Duration::from_nanos(0), async {
        sync_canister_histories().await;
    });
}

async fn sync_canister_histories() {
    let current_time_nanos = ic_cdk::api::time();
    if let Err(err) = service::sync_canister_histories().await {
        ic_cdk::println!("Failed to perform canister history sync: {err:?}");
    }
    let end_time_nanos = ic_cdk::api::time();
    let time_diff_nanos = end_time_nanos.saturating_sub(current_time_nanos);

    let next_run_nanos = MAX_TIME_BETWEEN_SYNCS_NANOS
        .saturating_sub(time_diff_nanos)
        .max(MIN_TIME_BETWEEN_SYNCS_NANOS);

    set_timer(Duration::from_nanos(next_run_nanos), async {
        sync_canister_histories().await;
    });
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
