use crate::{dto::ListMyProjectsResponse, service::project_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_projects() -> ApiResultDto<ListMyProjectsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::list_my_projects(caller).into()
}
