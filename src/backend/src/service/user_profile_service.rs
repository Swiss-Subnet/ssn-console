use crate::{
    data::{
        approval_policy_repository, organization_repository, project_repository, team_repository,
        user_profile_repository, ApprovalPolicy, OperationType, PolicyType, ProjectId,
        ProjectPermissions, StaffPermissions, UserId, UserProfile, UserStatus,
    },
    dto::{
        CreateMyUserProfileResponse, GetMyUserProfileResponse, GetUserProfilesByPrincipalsRequest,
        GetUserProfilesByPrincipalsResponse, GetUserProfilesByUserIdsRequest,
        GetUserProfilesByUserIdsResponse, GetUserStatsResponse, ListStaleUsersResponse,
        ListUserProfilesResponse, RejectionError, RejectionReason, StaleUserEntry,
        UpdateMyUserProfileRequest, UpdateUserProfileRequest, VerifyEmailRequest,
    },
    env,
    jwt::{extract_ed25519_public_key_from_pem, verify_jwt},
    mapping::{
        map_create_my_user_profile_response, map_get_my_user_profile_response,
        map_get_user_profiles_by_principals_response, map_get_user_profiles_by_user_ids_response,
        map_get_user_stats_response, map_list_user_profiles_response, map_user_status_request,
    },
    service::access_control_service::{self, ProjectAuth},
    service::staleness_service,
    validation::Email,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Claims {
    pub email: String,
    pub exp: usize,
    pub iat: usize,
    #[serde(default)]
    pub purpose: Option<String>,
}

pub(crate) const PURPOSE_EMAIL_VERIFICATION: &str = "email_verification";
pub(crate) const PURPOSE_ACCOUNT_RECOVERY: &str = "account_recovery";

pub fn list_user_profiles() -> ListUserProfilesResponse {
    map_list_user_profiles_response(user_profile_repository::list_user_profiles())
}

pub fn get_user_profiles_by_principals(
    caller: &Principal,
    req: GetUserProfilesByPrincipalsRequest,
) -> ApiResult<GetUserProfilesByPrincipalsResponse> {
    let project_id = ProjectId::try_from(req.project_id.as_str())?;
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

pub fn get_user_profiles_by_user_ids(
    caller: &Principal,
    req: GetUserProfilesByUserIdsRequest,
) -> ApiResult<GetUserProfilesByUserIdsResponse> {
    let project_id = ProjectId::try_from(req.project_id.as_str())?;
    ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;

    let profiles = req
        .user_ids
        .into_iter()
        .filter_map(|raw| UserId::try_from(raw.as_str()).ok())
        .filter(|user_id| {
            ProjectAuth::for_user(*user_id, project_id, ProjectPermissions::EMPTY).is_ok()
        })
        .filter_map(|user_id| {
            user_profile_repository::get_user_profile_by_user_id(&user_id)
                .map(|profile| (user_id, profile))
        })
        .collect();
    Ok(map_get_user_profiles_by_user_ids_response(profiles))
}

pub fn update_user_profile(req: UpdateUserProfileRequest) -> ApiResult {
    let user_id = UserId::try_from(req.user_id.as_str())?;
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
    access_control_service::assert_principal_is_unclaimed(&caller)?;

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

    if let Some(raw_email) = req.email {
        let new_email = Email::try_from(raw_email)?.into_inner();
        let previous_email = current_user_profile.email.clone();
        let changed = previous_email.as_deref() != Some(new_email.as_str());

        current_user_profile.email = Some(new_email);

        // Changing the address invalidates verification: the user has not
        // proven control of the new mailbox. Release the old index entry
        // here; the new address stays unclaimed until verify_email runs.
        if changed && current_user_profile.email_verified {
            current_user_profile.email_verified = false;
            if let Some(old) = previous_email.as_deref() {
                user_profile_repository::release_verified_email(user_id, old);
            }
        }
    }

    user_profile_repository::update_user_profile(user_id, current_user_profile)
        .expect("profile existence proven above");

    Ok(())
}

// Read-only; full scan, like list_user_profiles.
pub fn list_stale_users(caller: &Principal, now_ns: u64) -> ApiResult<ListStaleUsersResponse> {
    access_control_service::assert_staff_perm(caller, StaffPermissions::MANAGE_USERS)?;

    let entries = user_profile_repository::list_user_profiles()
        .into_iter()
        .filter(|(user_id, _, _)| staleness_service::is_prunable_user(*user_id, now_ns))
        .map(|(user_id, profile, _)| StaleUserEntry {
            id: user_id.to_string(),
            email: profile.email,
        })
        .collect();

    Ok(entries)
}

pub fn get_user_stats() -> GetUserStatsResponse {
    map_get_user_stats_response(user_profile_repository::get_user_stats())
}

pub fn verify_email(caller: Principal, req: VerifyEmailRequest) -> Result<(), RejectionError> {
    let pub_key_str = env::get_public_key();

    let pub_key_bytes = extract_ed25519_public_key_from_pem(&pub_key_str)
        .map_err(|e| ApiError::internal_error(format!("Failed to parse public key: {}", e)))?;

    let token_data: Claims = verify_jwt(&req.token, &pub_key_bytes)?;

    // Tolerant during rollout: legacy tokens (no purpose) and the new
    // purpose: "email_verification" both pass. Anything else (notably a
    // recovery token) is rejected. Tighten to require the claim once
    // auth-service has been live with purpose-minting for one release.
    match token_data.purpose.as_deref() {
        None | Some(PURPOSE_EMAIL_VERIFICATION) => {}
        Some(_) => {
            return Err(RejectionError::new(
                "Token cannot be used to verify an email.".to_string(),
                RejectionReason::WrongPurpose,
            ));
        }
    }

    let (user_id, mut profile) = user_profile_repository::get_user_profile_by_principal(&caller)
        .ok_or_else(|| {
            RejectionError::new(
                format!(
                    "User profile for principal {} does not exist.",
                    caller.to_text()
                ),
                RejectionReason::ProfileNotFound,
            )
        })?;

    let Some(stored_email) = profile.email.clone() else {
        return Err(ApiError::client_error(
            "User profile does not have an email to verify".to_string(),
        )
        .into());
    };

    // Normalize both sides: legacy rows weren't normalized at write time,
    // so a raw comparison would make verification unreachable for them.
    let profile_email = Email::try_from(stored_email)?;
    let claim_email = Email::try_from(token_data.email)?;
    if profile_email.as_str() != claim_email.as_str() {
        return Err(RejectionError::new(
            "Token email does not match user profile email".to_string(),
            RejectionReason::EmailMismatch,
        ));
    }

    // Claim the index before flipping the flag so a collision leaves the
    // profile untouched.
    user_profile_repository::claim_verified_email(user_id, profile_email)?;

    profile.email_verified = true;
    user_profile_repository::update_user_profile(user_id, profile)
        .expect("profile existence proven above");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{service_principal_repository, StaffPermissions};

    fn principal(byte: u8) -> Principal {
        let mut bytes = [0u8; 29];
        bytes[28] = byte;
        Principal::from_slice(&bytes)
    }

    #[test]
    fn create_my_user_profile_rejects_service_principal() {
        let sp = principal(240);
        service_principal_repository::set_service_principal_permissions(
            sp,
            StaffPermissions::READ_METRICS,
        );

        let err = create_my_user_profile(sp)
            .expect_err("service principal must not create a user profile");
        assert!(
            err.message().to_lowercase().contains("service"),
            "expected service-principal conflict, got {:?}",
            err.message(),
        );
    }
}
