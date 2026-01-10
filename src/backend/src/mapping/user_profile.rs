use crate::{
    data,
    dto::{ListUserProfilesResponse, UserProfile, UserStatus},
};

pub fn map_list_user_profiles_response(
    profiles: Vec<(data::Uuid, data::UserProfile)>,
) -> ListUserProfilesResponse {
    profiles
        .into_iter()
        .map(map_get_my_user_profile_response)
        .collect()
}

pub fn map_get_my_user_profile_response(
    (id, profile): (data::Uuid, data::UserProfile),
) -> UserProfile {
    UserProfile {
        id: id.to_string(),
        email: profile.email,
        status: map_user_status_response(profile.status),
    }
}

pub fn map_create_my_user_profile_response(
    (id, profile): (data::Uuid, data::UserProfile),
) -> UserProfile {
    map_get_my_user_profile_response((id, profile))
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
