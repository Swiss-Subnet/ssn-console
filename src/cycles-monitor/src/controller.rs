use crate::{
    constants::MAX_SNAPSHOTS_PER_RESPONSE,
    dto::{
        ListMetricsAfterRequest, ListMetricsAfterResponse, TriggerSyncMetricsRequest,
        TriggerSyncMetricsResponse,
    },
    env, service,
};
use canister_utils::{assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

canister_utils::define_timer!(
    cycles_timer,
    crate::service::sync_canister_metrics,
    "canister metrics sync",
    crate::constants::MAX_TIME_BETWEEN_SYNCS_NANOS,
    crate::constants::MIN_TIME_BETWEEN_SYNCS_NANOS
);

#[init]
fn init() {
    check_env_vars();
    setup_timer();
}

#[post_upgrade]
fn post_upgrade() {
    check_env_vars();
    setup_timer();
}

fn check_env_vars() {
    env::init_canister_history_id();
}

#[update]
fn trigger_sync_metrics(
    _req: TriggerSyncMetricsRequest,
) -> ApiResultDto<TriggerSyncMetricsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    let message = match run_timer() {
        Ok(_) => "Sync triggered successfully.".to_string(),
        Err(msg) => msg,
    };

    ApiResultDto::Ok(TriggerSyncMetricsResponse { message })
}

#[update]
fn list_metrics_after(req: ListMetricsAfterRequest) -> ApiResultDto<ListMetricsAfterResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(service::list_metrics_after(req, MAX_SNAPSHOTS_PER_RESPONSE))
}
