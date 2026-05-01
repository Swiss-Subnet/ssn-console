use crate::{dto, service::usage_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
fn upsert_usage(req: dto::UpsertUsageRequest) -> ApiResultDto<()> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    usage_service::upsert_usage(caller, req).into()
}

#[query]
fn get_usage(req: dto::GetUsageRequest) -> ApiResultDto<Vec<dto::CanisterUsage>> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    usage_service::get_usage(caller, req).into()
}
