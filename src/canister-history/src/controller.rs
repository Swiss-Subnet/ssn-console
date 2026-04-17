use crate::{
    canister_id::CanisterId,
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
use ic_cdk::{api::msg_caller, *};

canister_utils::define_timer!(
    history_timer,
    crate::service::sync_canister_histories,
    "canister history sync",
    crate::constants::MAX_TIME_BETWEEN_SYNCS_NANOS,
    crate::constants::MIN_TIME_BETWEEN_SYNCS_NANOS
);

#[init]
fn init() {
    setup_timer();
}

#[post_upgrade]
fn post_upgrade() {
    setup_timer();
}

#[update]
fn trigger_sync_canister_histories(
    _req: TriggerSyncCanisterHistoriesRequest,
) -> ApiResultDto<TriggerSyncCanisterHistoriesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    let message = match run_timer() {
        Ok(_) => "Sync triggered successfully.".to_string(),
        Err(msg) => msg,
    };

    ApiResultDto::Ok(TriggerSyncCanisterHistoriesResponse { message })
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
