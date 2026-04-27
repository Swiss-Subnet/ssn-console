use crate::{
    dto::{
        CreateMyUserProfileResponse, GetMyUserProfileResponse, GetUserProfilesByPrincipalsRequest,
        GetUserProfilesByPrincipalsResponse, GetUserStatsResponse, ListUserProfilesResponse,
        UpdateMyUserProfileRequest, UpdateUserProfileRequest, VerifyEmailRequest,
    },
    service::{access_control_service, user_profile_service},
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_user_profiles() -> ApiResultDto<ListUserProfilesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(user_profile_service::list_user_profiles())
}

#[query]
fn get_user_profiles_by_principals(
    request: GetUserProfilesByPrincipalsRequest,
) -> ApiResultDto<GetUserProfilesByPrincipalsResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    user_profile_service::get_user_profiles_by_principals(&caller, request).into()
}

#[update]
fn update_user_profile(req: UpdateUserProfileRequest) -> ApiResultDto {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    user_profile_service::update_user_profile(req).into()
}

#[query]
fn get_my_user_profile() -> ApiResultDto<GetMyUserProfileResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(user_profile_service::get_my_user_profile(caller))
}

#[update]
fn create_my_user_profile() -> ApiResultDto<CreateMyUserProfileResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    user_profile_service::create_my_user_profile(caller).into()
}

#[update]
fn update_my_user_profile(req: UpdateMyUserProfileRequest) -> ApiResultDto {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    user_profile_service::update_my_user_profile(caller, req).into()
}

#[query]
fn get_user_stats() -> ApiResultDto<GetUserStatsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(user_profile_service::get_user_stats())
}

#[update]
fn verify_my_email(req: VerifyEmailRequest) -> ApiResultDto {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    user_profile_service::verify_email(caller, req).into()
}
