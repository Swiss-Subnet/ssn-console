use crate::{
    constants::MAX_SNAPSHOTS_PER_RESPONSE,
    dto::{
        ListMetricsAfterRequest, ListMetricsAfterResponse, TriggerSyncMetricsRequest,
        TriggerSyncMetricsResponse,
    },
    env, service,
};
use base64::{engine::general_purpose, Engine as _};
use candid::Principal;
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
    env::init_public_key();
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
    let pub_key_pem = env::get_public_key();

    // Parse PEM by extracting the base64 part
    let base64_str = pub_key_pem
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect::<String>();

    let pub_key_der = match general_purpose::STANDARD.decode(base64_str.trim()) {
        Ok(der) => der,
        Err(_) => {
            return ApiResultDto::Err(canister_utils::ApiError::internal_error(
                "Failed to decode public key".to_string(),
            ))
        }
    };

    let expected_principal = Principal::self_authenticating(&pub_key_der);

    let is_expected_principal = caller == expected_principal;
    let is_controller = assert_controller(&caller).is_ok();

    if !is_expected_principal && !is_controller {
        return ApiResultDto::Err(canister_utils::ApiError::unauthorized(
            "Unauthorized".to_string(),
        ));
    }

    ApiResultDto::Ok(service::list_metrics_after(req, MAX_SNAPSHOTS_PER_RESPONSE))
}
