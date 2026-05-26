use crate::{dto, env, service::usage_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
fn record_usage(req: dto::RecordUsageRequest) -> ApiResultDto<dto::RecordUsageResponse> {
    if msg_caller() != env::get_public_key_principal() {
        return ApiResultDto::Err(canister_utils::ApiError::unauthorized(
            "Only the offchain-service is allowed to call this endpoint".to_string(),
        ));
    }

    usage_service::record_usage(req).into()
}

#[query]
fn get_usage(req: dto::GetUsageRequest) -> ApiResultDto<dto::GetUsageResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    usage_service::get_usage(caller, req).into()
}
