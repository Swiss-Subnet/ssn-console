use crate::{
    dto::{
        CreateMyUserProfileResponse, GetMyUserProfileResponse, ListUserProfilesResponse,
        UpdateMyUserProfileRequest, UpdateUserProfileRequest, UserStats,
    },
    service::{access_control_service, user_profile_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_user_profiles() -> ListUserProfilesResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    user_profile_service::list_user_profiles()
}

#[update]
fn update_user_profile(req: UpdateUserProfileRequest) {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    if let Err(err) = user_profile_service::update_user_profile(req) {
        trap(&err);
    }
}

#[query]
fn get_my_user_profile() -> GetMyUserProfileResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    user_profile_service::get_my_user_profile(calling_principal)
}

#[update]
fn create_my_user_profile() -> CreateMyUserProfileResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match user_profile_service::create_my_user_profile(calling_principal) {
        Ok(profile) => profile,
        Err(err) => trap(&err),
    }
}

#[update]
fn update_my_user_profile(req: UpdateMyUserProfileRequest) {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    if let Err(err) = user_profile_service::update_my_user_profile(calling_principal, req) {
        trap(&err);
    }
}

#[query]
fn get_user_stats() -> UserStats {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    user_profile_service::get_user_stats()
}
