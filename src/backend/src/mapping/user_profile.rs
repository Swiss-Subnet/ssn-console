use crate::{
    data,
    dto::{ListUserProfilesResponse, MyUserProfile, UserProfile, UserStatus},
};
use candid::Principal;
use ic_cdk::api::is_controller;

pub fn map_list_user_profiles_response(
    profiles: Vec<(data::Uuid, data::UserProfile)>,
) -> ListUserProfilesResponse {
    profiles
        .into_iter()
        .map(|(id, profile)| {
            UserProfile {
                id: id.to_string(),
                email: profile.email,
                status: map_user_status_response(profile.status),
            }
        })
        .collect()
}

pub fn map_get_my_user_profile_response(
    id: data::Uuid,
    principal: &Principal,
    profile: data::UserProfile,
) -> MyUserProfile {
    let is_admin = is_controller(principal);
    MyUserProfile {
        id: id.to_string(),
        email: profile.email,
        status: map_user_status_response(profile.status),
        is_admin,
    }
}

pub fn map_create_my_user_profile_response(
    id: data::Uuid,
    principal: &Principal,
    profile: data::UserProfile,
) -> MyUserProfile {
    map_get_my_user_profile_response(id, principal, profile)
}

pub fn map_user_status_request(status: UserStatus) -> data::UserStatus {
    match status {
        UserStatus::Active => data::UserStatus::Active,
        UserStatus::Inactive => data::UserStatus::Inactive,
    }
}

pub fn map_user_status_response(status: data::UserStatus) -> UserStatus {
    match status {
        data::UserStatus::Active => UserStatus::Active,
        data::UserStatus::Inactive => UserStatus::Inactive,
    }
}
