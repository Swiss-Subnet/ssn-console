use crate::{
    data,
    data::UserStatsData,
    dto::{
        GetUserProfilesByPrincipalsResponse, GetUserStatsResponse, ListUserProfilesResponse,
        UserProfile, UserProfileBrief, UserProfileByPrincipal, UserStatus,
    },
};
use candid::Principal;
use canister_utils::Uuid;
use ic_cdk::api::is_controller;

pub fn map_list_user_profiles_response(
    profiles: Vec<(Uuid, data::UserProfile, Vec<Principal>)>,
) -> ListUserProfilesResponse {
    profiles
        .into_iter()
        .map(|(id, profile, principals)| UserProfile {
            id: id.to_string(),
            email: profile.email,
            email_verified: profile.email_verified,
            status: map_user_status_response(profile.status),
            is_admin: principals.iter().any(is_controller),
        })
        .collect()
}

pub fn map_get_my_user_profile_response(
    id: Uuid,
    principal: &Principal,
    profile: data::UserProfile,
) -> UserProfile {
    let is_admin = is_controller(principal);
    UserProfile {
        id: id.to_string(),
        email: profile.email,
        email_verified: profile.email_verified,
        status: map_user_status_response(profile.status),
        is_admin,
    }
}

pub fn map_create_my_user_profile_response(
    id: Uuid,
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

pub fn map_get_user_profiles_by_principals_response(
    lookups: Vec<(Principal, Option<(Uuid, data::UserProfile)>)>,
) -> GetUserProfilesByPrincipalsResponse {
    GetUserProfilesByPrincipalsResponse {
        profiles: lookups
            .into_iter()
            .map(|(subject_principal, found)| UserProfileByPrincipal {
                subject_principal,
                profile: found.map(|(id, profile)| UserProfileBrief {
                    id: id.to_string(),
                    email: profile.email,
                    email_verified: profile.email_verified,
                }),
            })
            .collect(),
    }
}

pub fn map_get_user_stats_response(stats: UserStatsData) -> GetUserStatsResponse {
    GetUserStatsResponse {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
    }
}
