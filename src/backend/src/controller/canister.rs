use crate::{
    dto::{
        ListAllCanistersRequest, ListAllCanistersResponse, ListProjectCanistersRequest,
        ListProjectCanistersResponse,
    },
    service::canister_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn list_project_canisters(
    req: ListProjectCanistersRequest,
) -> ApiResultDto<ListProjectCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_project_canisters(&caller, &req.project_id, req.limit, req.page)
        .await
        .into()
}

#[query]
fn list_all_canisters(req: ListAllCanistersRequest) -> ApiResultDto<ListAllCanistersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    canister_service::list_all_canisters(req.limit, req.page).into()
}
