use crate::{
    dto::{
        CreateProjectRequest, CreateProjectResponse, ListMyProjectsRequest, ListMyProjectsResponse,
        ListOrgProjectsRequest, ListOrgProjectsResponse,
    },
    service::project_service,
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_projects(_: ListMyProjectsRequest) -> ApiResultDto<ListMyProjectsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::list_my_projects(&caller).into()
}

#[query]
fn list_org_projects(req: ListOrgProjectsRequest) -> ApiResultDto<ListOrgProjectsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::list_org_projects(&caller, req).into()
}

#[update]
fn create_project(req: CreateProjectRequest) -> ApiResultDto<CreateProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::create_project(&caller, req).into()
}
