use crate::{
    data::{
        approval_policy_repository, organization_repository, project_repository, team_repository,
        user_profile_repository, ApprovalPolicy, OperationType, PolicyType, ProjectPermissions,
        UserProfile, UserStatus,
    },
    dto::{
        CreateMyUserProfileResponse, GetMyUserProfileResponse, GetUserProfilesByPrincipalsRequest,
        GetUserProfilesByPrincipalsResponse, GetUserStatsResponse, ListUserProfilesResponse,
        UpdateMyUserProfileRequest, UpdateUserProfileRequest, VerifyEmailRequest,
    },
    env,
    jwt::{extract_ed25519_public_key_from_pem, verify_jwt},
    mapping::{
        map_create_my_user_profile_response, map_get_my_user_profile_response,
        map_get_user_profiles_by_principals_response, map_get_user_stats_response,
        map_list_user_profiles_response, map_user_status_request,
    },
    service::access_control_service::ProjectAuth,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    email: String,
    exp: usize,
    iat: usize,
}

pub fn list_user_profiles() -> ListUserProfilesResponse {
    map_list_user_profiles_response(user_profile_repository::list_user_profiles())
}

pub fn get_user_profiles_by_principals(
    caller: &Principal,
    req: GetUserProfilesByPrincipalsRequest,
) -> ApiResult<GetUserProfilesByPrincipalsResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;

    let lookups = req
        .principals
        .into_iter()
        .map(|principal| {
            let found = user_profile_repository::get_user_profile_by_principal(&principal).filter(
                |(user_id, _)| {
                    ProjectAuth::for_user(*user_id, project_id, ProjectPermissions::EMPTY).is_ok()
                },
            );
            (principal, found)
        })
        .collect();
    Ok(map_get_user_profiles_by_principals_response(lookups))
}

pub fn update_user_profile(req: UpdateUserProfileRequest) -> ApiResult {
    let user_id = Uuid::try_from(req.user_id.as_str())?;
    let mut current_user_profile = user_profile_repository::get_user_profile_by_user_id(&user_id)
        .ok_or_else(|| {
        ApiError::client_error(format!(
            "User profile for user with id {} does not exist.",
            user_id
        ))
    })?;

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

pub fn get_my_user_profile(caller: Principal) -> GetMyUserProfileResponse {
    user_profile_repository::get_user_profile_by_principal(&caller)
        .map(|(id, profile)| map_get_my_user_profile_response(id, &caller, profile))
}

pub fn create_my_user_profile(caller: Principal) -> ApiResult<CreateMyUserProfileResponse> {
    if user_profile_repository::get_user_id_by_principal(&caller).is_some() {
        return Err(ApiError::client_error(format!(
            "User profile for principal {} already exists.",
            caller.to_text()
        )));
    }

    let profile = UserProfile::default();
    let user_id = user_profile_repository::create_user_profile(caller, profile.clone());
    user_profile_repository::increment_user_count(profile.status == UserStatus::Active);
    let org_id = organization_repository::add_default_org(user_id);
    let team_id = team_repository::add_default_team(user_id, org_id);
    let project_id = project_repository::add_default_project(team_id, org_id);
    approval_policy_repository::upsert_approval_policy(
        project_id,
        OperationType::CreateCanister,
        ApprovalPolicy {
            policy_type: PolicyType::AutoApprove,
        },
    );
    approval_policy_repository::upsert_approval_policy(
        project_id,
        OperationType::AddCanisterController,
        ApprovalPolicy {
            policy_type: PolicyType::AutoApprove,
        },
    );

    Ok(map_create_my_user_profile_response(
        user_id, &caller, profile,
    ))
}

pub fn update_my_user_profile(caller: Principal, req: UpdateMyUserProfileRequest) -> ApiResult {
    let (user_id, mut current_user_profile) =
        user_profile_repository::get_user_profile_by_principal(&caller).ok_or_else(|| {
            ApiError::client_error(format!(
                "User profile for principal {} does not exist.",
                caller.to_text()
            ))
        })?;

    if let Some(email) = req.email {
        current_user_profile.email = Some(email);
    }

    user_profile_repository::update_user_profile(user_id, current_user_profile)?;

    Ok(())
}

pub fn get_user_stats() -> GetUserStatsResponse {
    map_get_user_stats_response(user_profile_repository::get_user_stats())
}

pub fn verify_email(caller: Principal, req: VerifyEmailRequest) -> ApiResult {
    let pub_key_str = env::get_public_key();

    let pub_key_bytes = extract_ed25519_public_key_from_pem(&pub_key_str)
        .map_err(|e| ApiError::internal_error(format!("Failed to parse public key: {}", e)))?;

    let token_data: Claims = verify_jwt(&req.token, &pub_key_bytes)?;

    let (user_id, mut profile) = user_profile_repository::get_user_profile_by_principal(&caller)
        .ok_or_else(|| {
            ApiError::client_error(format!(
                "User profile for principal {} does not exist.",
                caller.to_text()
            ))
        })?;

    let Some(email) = &profile.email else {
        return Err(ApiError::client_error(
            "User profile does not have an email to verify".to_string(),
        ));
    };

    if email != &token_data.email {
        return Err(ApiError::client_error(
            "Token email does not match user profile email".to_string(),
        ));
    }

    profile.email_verified = true;
    user_profile_repository::update_user_profile(user_id, profile)?;

    Ok(())
}
