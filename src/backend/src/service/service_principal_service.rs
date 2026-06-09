use crate::{
    data::{service_principal_repository, user_profile_repository, StaffPermissions},
    dto::{
        GrantServicePrincipalPermissionsRequest, ListServicePrincipalsResponse,
        RevokeServicePrincipalPermissionsRequest, ServicePrincipalEntry,
    },
    mapping::{map_staff_permissions, map_staff_permissions_from_dto},
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult};

pub fn grant_service_principal_permissions(
    req: GrantServicePrincipalPermissionsRequest,
) -> ApiResult {
    reject_anonymous(&req.service_principal)?;
    // Idempotent re-grant: only check the user-profile side, not the full
    // unclaimed helper, so existing service principals can be re-granted.
    if user_profile_repository::get_user_id_by_principal(&req.service_principal).is_some() {
        return Err(ApiError::client_error(
            "Principal is already linked to a user account.".to_string(),
        ));
    }
    let perms = map_staff_permissions_from_dto(req.permissions);
    if perms == StaffPermissions::EMPTY {
        return Err(ApiError::client_error(
            "Cannot grant empty staff permissions; use revoke instead.".to_string(),
        ));
    }
    service_principal_repository::set_service_principal_permissions(req.service_principal, perms);
    Ok(())
}

pub fn revoke_service_principal_permissions(
    req: RevokeServicePrincipalPermissionsRequest,
) -> ApiResult {
    reject_anonymous(&req.service_principal)?;
    service_principal_repository::remove_service_principal(&req.service_principal);
    Ok(())
}

fn reject_anonymous(p: &Principal) -> ApiResult {
    if p == &Principal::anonymous() {
        return Err(ApiError::client_error(
            "Anonymous principal is not a valid service principal.".to_string(),
        ));
    }
    Ok(())
}

pub fn list_service_principals() -> ListServicePrincipalsResponse {
    ListServicePrincipalsResponse {
        service_principals: service_principal_repository::list_service_principals()
            .into_iter()
            .map(|(service_principal, perms)| ServicePrincipalEntry {
                service_principal,
                permissions: map_staff_permissions(perms),
            })
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;

    fn full_perms_dto() -> crate::dto::StaffPermissions {
        crate::dto::StaffPermissions {
            read_all_orgs: true,
            write_billing: true,
            manage_users: true,
            read_metrics: true,
        }
    }

    #[test]
    fn grant_rejects_anonymous_principal() {
        let req = GrantServicePrincipalPermissionsRequest {
            service_principal: Principal::anonymous(),
            permissions: full_perms_dto(),
        };
        let err = grant_service_principal_permissions(req)
            .expect_err("anonymous principal must not be a grantee");
        assert!(
            format!("{err:?}").to_lowercase().contains("anonymous"),
            "error should mention anonymous, got {err:?}",
        );
    }

    #[test]
    fn revoke_rejects_anonymous_principal() {
        let req = RevokeServicePrincipalPermissionsRequest {
            service_principal: Principal::anonymous(),
        };
        revoke_service_principal_permissions(req)
            .expect_err("anonymous principal is never a legitimate grantee");
    }

    #[test]
    fn grant_rejects_principal_with_existing_user_profile() {
        use crate::data::user_profile_repository::create_user_profile;
        use crate::data::UserProfile;
        let mut bytes = [0u8; 29];
        bytes[28] = 230;
        let p = Principal::from_slice(&bytes);
        create_user_profile(p, UserProfile::default());

        let req = GrantServicePrincipalPermissionsRequest {
            service_principal: p,
            permissions: full_perms_dto(),
        };
        let err = grant_service_principal_permissions(req).expect_err(
            "principal that already has a user profile must not become a service principal",
        );
        assert!(
            format!("{err:?}").to_lowercase().contains("user"),
            "error should mention user profile conflict, got {err:?}",
        );
    }
}
