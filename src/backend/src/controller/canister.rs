use crate::{dto::ListMyCanistersResponse, service::canister_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn list_my_canisters() -> ApiResultDto<ListMyCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_my_canisters(caller).await.into()
}
