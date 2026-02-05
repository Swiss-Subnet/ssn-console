use crate::{
    data,
    data::{UserStatsData},
    dto::{ListUserProfilesResponse, UserProfile, UserStatus, GetUserStatsResponse},
};
use candid::Principal;
use ic_cdk::api::is_controller;

pub fn map_list_user_profiles_response(
    profiles: Vec<(data::Uuid, data::UserProfile, Vec<Principal>)>,
) -> ListUserProfilesResponse {
    profiles
        .into_iter()
        .map(|(id, profile, principals)| UserProfile {
            id: id.to_string(),
            email: profile.email,
            status: map_user_status_response(profile.status),
            is_admin: principals.iter().any(|p| is_controller(p)),
        })
        .collect()
}

pub fn map_get_my_user_profile_response(
    id: data::Uuid,
    principal: &Principal,
    profile: data::UserProfile,
) -> UserProfile {
    let is_admin = is_controller(principal);
    UserProfile {
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
) -> UserProfile {
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

pub fn map_get_user_stats_response(stats: UserStatsData) -> GetUserStatsResponse {
    GetUserStatsResponse {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
    }
}
