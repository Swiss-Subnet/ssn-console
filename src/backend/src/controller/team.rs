use crate::{
    dto::{
        AddUserToTeamRequest, AddUserToTeamResponse, CreateTeamRequest, CreateTeamResponse,
        DeleteTeamRequest, DeleteTeamResponse, GetTeamRequest, GetTeamResponse,
        ListOrgTeamsRequest, ListTeamUsersRequest, ListTeamUsersResponse, ListTeamsResponse,
        UpdateTeamRequest, UpdateTeamResponse,
    },
    service::team_service,
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_teams() -> ApiResultDto<ListTeamsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::list_my_teams(caller).into()
}

#[query]
fn list_org_teams(req: ListOrgTeamsRequest) -> ApiResultDto<ListTeamsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::list_org_teams(&caller, req).into()
}

#[update]
fn create_team(req: CreateTeamRequest) -> ApiResultDto<CreateTeamResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::create_team(&caller, req).into()
}

#[query]
fn get_team(req: GetTeamRequest) -> ApiResultDto<GetTeamResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::get_team(&caller, req).into()
}

#[update]
fn update_team(req: UpdateTeamRequest) -> ApiResultDto<UpdateTeamResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::update_team(&caller, req).into()
}

#[update]
fn delete_team(req: DeleteTeamRequest) -> ApiResultDto<DeleteTeamResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::delete_team(&caller, req).into()
}

#[update]
fn add_user_to_team(req: AddUserToTeamRequest) -> ApiResultDto<AddUserToTeamResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::add_user_to_team(&caller, req).into()
}

#[query]
fn list_team_users(req: ListTeamUsersRequest) -> ApiResultDto<ListTeamUsersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::list_team_users(&caller, req).into()
}
