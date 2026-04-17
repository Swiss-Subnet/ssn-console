use crate::{
    dto::{
        GetCanisterMetricsRequest, GetCanisterMetricsResponse, TriggerSyncMetricsRequest,
        TriggerSyncMetricsResponse,
    },
    service,
};
use canister_utils::{assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

canister_utils::define_timer!(
    cycles_timer,
    crate::service::sync_canister_cycles,
    "canister cycles sync",
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
async fn get_canister_metrics(
    _req: GetCanisterMetricsRequest,
) -> ApiResultDto<GetCanisterMetricsResponse> {
    service::get_canister_metrics().await.into()
}
