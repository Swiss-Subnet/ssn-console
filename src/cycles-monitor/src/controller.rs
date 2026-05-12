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
    // Canbench does not support setting environment variables, so skip the
    // check that environment variables are set until that's supported.
    //
    // This is safe to do as long as benchmarks do not need to access
    // environment variables, which is true for the current set of benchmarks.
    #[cfg(not(feature = "canbench-rs"))]
    {
        env::init_canister_history_id();
        env::init_public_key();
    }
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
    let expected_principal = env::get_public_key_principal();

    let is_expected_principal = caller == expected_principal;
    let is_controller = assert_controller(&caller).is_ok();

    if !is_expected_principal && !is_controller {
        return ApiResultDto::Err(canister_utils::ApiError::unauthorized(
            "Unauthorized".to_string(),
        ));
    }

    ApiResultDto::Ok(service::list_metrics_after(req, MAX_SNAPSHOTS_PER_RESPONSE))
}
