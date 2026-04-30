use crate::{
    data::{self, user_profile_repository},
    dto::{
        GetMyStaffPermissionsResponse, GrantStaffPermissionsRequest, RevokeStaffPermissionsRequest,
    },
    mapping::{map_staff_permissions, map_staff_permissions_from_dto},
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

// Replace a user's staff permission set. Caller authorisation lives in
// the controller layer (controller key required); this service trusts
// it has been performed.
//
// The DTO-level shape (named booleans) means the request can only express
// known flags — there is no "unknown bits" attack surface to validate
// against here. We do reject the empty grant: a Some(EMPTY) record and a
// None record have identical authorization effect, so admins must use
// revoke for clarity instead of granting "no permissions".
//
// Existing staff_permissions on the target profile are *replaced*, not
// merged. Callers that intend to add a single flag must read first and
// send the union.
pub fn grant_staff_permissions(req: GrantStaffPermissionsRequest) -> ApiResult {
    let perms = map_staff_permissions_from_dto(req.permissions);
    if perms == data::StaffPermissions::EMPTY {
        return Err(ApiError::client_error(
            "Refusing to grant empty staff permissions; \
             call revoke_staff_permissions instead."
                .to_string(),
        ));
    }

    let user_id = Uuid::try_from(req.user_id.as_str())?;
    let mut profile =
        user_profile_repository::get_user_profile_by_user_id(&user_id).ok_or_else(|| {
            ApiError::client_error(format!("User profile with id {user_id} does not exist."))
        })?;
    profile.staff_permissions = Some(perms);
    user_profile_repository::update_user_profile(user_id, profile)
}

pub fn revoke_staff_permissions(req: RevokeStaffPermissionsRequest) -> ApiResult {
    let user_id = Uuid::try_from(req.user_id.as_str())?;
    let mut profile =
        user_profile_repository::get_user_profile_by_user_id(&user_id).ok_or_else(|| {
            ApiError::client_error(format!("User profile with id {user_id} does not exist."))
        })?;
    profile.staff_permissions = None;
    user_profile_repository::update_user_profile(user_id, profile)
}

// Returns the caller's own staff permissions, or `None` if they are not
// staff (no profile, or profile.staff_permissions is None). Never reveals
// information about other users.
pub fn get_my_staff_permissions(caller: &Principal) -> GetMyStaffPermissionsResponse {
    user_profile_repository::get_user_profile_by_principal(caller)
        .and_then(|(_, profile)| profile.staff_permissions)
        .map(map_staff_permissions)
}
