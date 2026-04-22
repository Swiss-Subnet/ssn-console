use crate::{
    dto::{
        ListAllCanistersRequest, ListAllCanistersResponse, ListMyCanistersRequest,
        ListMyCanistersResponse, ListUserCanistersRequest, ListUserCanistersResponse,
        RemoveMyCanisterRequest, UpdateMyCanisterNameRequest,
    },
    service::canister_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto, Uuid};
use ic_cdk::{api::msg_caller, *};

async fn remove_my_canister_inner(
    caller: candid::Principal,
    request: RemoveMyCanisterRequest,
) -> canister_utils::ApiResult<()> {
    let canister_id = Uuid::try_from(request.canister_id.as_str())?;
    canister_service::remove_my_canister(caller, canister_id).await
}

#[update]
async fn list_my_canisters(
    request: ListMyCanistersRequest,
) -> ApiResultDto<ListMyCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_my_canisters(caller, request)
        .await
        .into()
}

#[update]
async fn list_user_canisters(
    request: ListUserCanistersRequest,
) -> ApiResultDto<ListUserCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_user_canisters(request).await.into()
}

#[update]
async fn remove_my_canister(request: RemoveMyCanisterRequest) -> ApiResultDto<()> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    remove_my_canister_inner(caller, request).await.into()
}

#[update]
fn update_my_canister_name(request: UpdateMyCanisterNameRequest) -> ApiResultDto<()> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::update_my_canister_name(caller, request).into()
}

#[query]
fn list_all_canisters(request: ListAllCanistersRequest) -> ApiResultDto<ListAllCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_all_canisters(request.limit, request.page).into()
}
