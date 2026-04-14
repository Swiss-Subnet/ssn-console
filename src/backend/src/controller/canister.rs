use crate::{
    dto::{
        ListAllCanistersRequest, ListAllCanistersResponse, ListMyCanistersResponse,
        ListUserCanistersRequest, ListUserCanistersResponse,
    },
    service::canister_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn list_my_canisters() -> ApiResultDto<ListMyCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_my_canisters(caller).await.into()
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

#[query]
fn list_all_canisters(request: ListAllCanistersRequest) -> ApiResultDto<ListAllCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_all_canisters(request.limit, request.page).into()
}
