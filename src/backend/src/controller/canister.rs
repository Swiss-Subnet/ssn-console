use crate::{
    dto::{
        AddChildCanistersRequest, AddChildCanistersResponse, ListAllCanistersRequest,
        ListAllCanistersResponse, ListMyCanistersRequest, ListMyCanistersResponse,
        ListUserCanistersRequest, ListUserCanistersResponse, RemoveMyCanisterRequest,
        UpdateMyCanisterNameRequest,
    },
    env,
    service::canister_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResult, ApiResultDto, Uuid};
use ic_cdk::{api::msg_caller, *};

fn remove_my_canister_inner(
    caller: candid::Principal,
    request: RemoveMyCanisterRequest,
) -> ApiResult<()> {
    let canister_id = Uuid::try_from(request.canister_id.as_str())?;
    canister_service::remove_my_canister(caller, canister_id)
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
fn remove_my_canister(request: RemoveMyCanisterRequest) -> ApiResultDto<()> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    remove_my_canister_inner(caller, request).into()
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

#[update]
async fn add_child_canisters(
    request: AddChildCanistersRequest,
) -> ApiResultDto<AddChildCanistersResponse> {
    if msg_caller() != env::get_canister_history_id() {
        return ApiResultDto::Err(canister_utils::ApiError::unauthorized(
            "Only the canister-history canister is allowed to call this endpoint".to_string(),
        ));
    }

    canister_service::add_child_canisters(request).await.into()
}
