use crate::{
    dto::{
        AddTeamToProjectRequest, AddTeamToProjectResponse, CreateProjectRequest,
        CreateProjectResponse, DeleteProjectRequest, DeleteProjectResponse, GetProjectRequest,
        GetProjectResponse, ListMyProjectsRequest, ListMyProjectsResponse, ListOrgProjectsRequest,
        ListOrgProjectsResponse, ListProjectTeamsRequest, ListTeamsResponse,
        RemoveTeamFromProjectRequest, RemoveTeamFromProjectResponse, UpdateProjectRequest,
        UpdateProjectResponse,
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

#[query]
fn get_project(req: GetProjectRequest) -> ApiResultDto<GetProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::get_project(&caller, req).into()
}

#[update]
fn update_project(req: UpdateProjectRequest) -> ApiResultDto<UpdateProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::update_project(&caller, req).into()
}

#[update]
fn delete_project(req: DeleteProjectRequest) -> ApiResultDto<DeleteProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::delete_project(&caller, req).into()
}

#[query]
fn list_project_teams(req: ListProjectTeamsRequest) -> ApiResultDto<ListTeamsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::list_project_teams(&caller, req).into()
}

#[update]
fn add_team_to_project(req: AddTeamToProjectRequest) -> ApiResultDto<AddTeamToProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::add_team_to_project(&caller, req).into()
}

#[update]
fn remove_team_from_project(
    req: RemoveTeamFromProjectRequest,
) -> ApiResultDto<RemoveTeamFromProjectResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    project_service::remove_team_from_project(&caller, req).into()
}
