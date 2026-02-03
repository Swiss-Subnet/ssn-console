use crate::{
    data::{user_profile_repository, UserProfile, Uuid, UserStatus},
    dto::{
        CreateMyUserProfileResponse, GetMyUserProfileResponse, ListUserProfilesResponse,
        UpdateMyUserProfileRequest, UpdateUserProfileRequest, GetUserStatsResponse
    },
    mapping::{
        map_create_my_user_profile_response, map_get_my_user_profile_response,
        map_list_user_profiles_response, map_user_status_request,
        map_get_user_stats_response
    },
};
use candid::Principal;

pub fn list_user_profiles() -> ListUserProfilesResponse {
    map_list_user_profiles_response(user_profile_repository::list_user_profiles())
}

pub fn update_user_profile(req: UpdateUserProfileRequest) -> Result<(), String> {
    let user_id = Uuid::try_from(req.user_id.as_str())?;
    let mut current_user_profile =
        user_profile_repository::get_user_profile_by_user_id(&user_id)
            .ok_or_else(|| format!("User profile for user with id {} does not exist", user_id))?;

    if let Some(status) = req.status {
        let new_status = map_user_status_request(status);
        if current_user_profile.status != new_status {
            let old_was_active = current_user_profile.status == UserStatus::Active;
            current_user_profile.status = new_status;
            let new_is_active = current_user_profile.status == UserStatus::Active;
            user_profile_repository::update_user_status_count(old_was_active, new_is_active);
        }
    }

    user_profile_repository::update_user_profile(user_id, current_user_profile)?;

    Ok(())
}

pub fn get_my_user_profile(calling_principal: Principal) -> GetMyUserProfileResponse {
    user_profile_repository::get_user_profile_by_principal(&calling_principal)
        .map(|(id, profile)| map_get_my_user_profile_response(id, &calling_principal, profile))
}

pub fn create_my_user_profile(
    calling_principal: Principal,
) -> Result<CreateMyUserProfileResponse, String> {
    if user_profile_repository::get_user_id_by_principal(&calling_principal).is_some() {
        return Err(format!(
            "User profile for principal {} already exists",
            calling_principal.to_text()
        ));
    }

    let profile = UserProfile::default();
    let id = user_profile_repository::create_user_profile(calling_principal, profile.clone());
    user_profile_repository::increment_user_count(profile.status == UserStatus::Active);
    Ok(map_create_my_user_profile_response(
        id,
        &calling_principal,
        profile,
    ))
}

pub fn update_my_user_profile(
    calling_principal: Principal,
    req: UpdateMyUserProfileRequest,
) -> Result<(), String> {
    let (user_id, mut current_user_profile) =
        user_profile_repository::get_user_profile_by_principal(&calling_principal).ok_or_else(
            || {
                format!(
                    "User profile for principal {} does not exist",
                    calling_principal.to_text()
                )
            },
        )?;

    if let Some(email) = req.email {
        current_user_profile.email = Some(email);
    }

    user_profile_repository::update_user_profile(user_id, current_user_profile)?;

    Ok(())
}

pub fn get_user_stats() -> GetUserStatsResponse {
    map_get_user_stats_response(user_profile_repository::get_user_stats())
}
