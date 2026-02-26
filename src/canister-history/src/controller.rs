use crate::{
    canister_id::CanisterId,
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
use ic_cdk_timers::{set_timer, set_timer_interval};
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
        if let Err(err) = service::sync_canister_histories().await {
            ic_cdk::println!("Failed to perform initial canister history sync: {err:?}");
        }
    });

    set_timer_interval(Duration::from_mins(5), || async {
        if let Err(err) = service::sync_canister_histories().await {
            ic_cdk::println!("Failed to perform regular cansiter history sync : {err:?}");
        }
    });
}

#[update]
fn update_subnet_canister_ranges(
    request: UpdateSubnetCanisterRangesRequest,
) -> ApiResultDto<UpdateSubnetCanisterRangesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(caller) {
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
    let caller = msg_caller();
    if let Err(err) = assert_controller(caller) {
        return ApiResultDto::Err(err);
    }

    let res = service::list_subnet_canister_ranges();
    ApiResultDto::Ok(res)
}

#[query]
fn list_subnet_canister_ids(
    req: ListSubnetCanisterIdsRequest,
) -> ApiResultDto<ListSubnetCanisterIdsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(caller) {
        return ApiResultDto::Err(err);
    }

    let res = service::list_subnet_canister_ids(req);
    ApiResultDto::Ok(res)
}

#[query]
fn list_canister_changes(
    req: ListCanisterChangesRequest,
) -> ApiResultDto<ListCanisterChangesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(caller) {
        return ApiResultDto::Err(err);
    }

    let res = service::list_canister_changes(req);
    ApiResultDto::Ok(res)
}
