use crate::{
    dto::{
        GetMyStaffPermissionsRequest, GetMyStaffPermissionsResponse, GrantStaffPermissionsRequest,
        GrantStaffPermissionsResponse, ListStaffRequest, ListStaffResponse,
        RevokeStaffPermissionsRequest, RevokeStaffPermissionsResponse,
    },
    service::staff_permissions_service,
};
use canister_utils::{assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

// Self-introspection: returns the caller's own staff permission bits, or
// None if they are not staff. Open to any authenticated principal because
// it never reveals information about other users; non-staff callers get
// None back, which is not sensitive.
#[query]
fn get_my_staff_permissions(
    _req: GetMyStaffPermissionsRequest,
) -> ApiResultDto<GetMyStaffPermissionsResponse> {
    let caller = msg_caller();
    ApiResultDto::Ok(staff_permissions_service::get_my_staff_permissions(&caller))
}

// Replace a user's staff permission bitmask. Controller-gated: only the
// dev/ops team holding the canister controller key can promote business-
// team members. A future PR may add an admin-tier `MANAGE_STAFF` flag
// that allows a sufficiently privileged staff member to grant peers up
// to their own ceiling, but for v1 promotion is controller-only to keep
// the trust boundary unambiguous.
#[update]
fn grant_staff_permissions(
    req: GrantStaffPermissionsRequest,
) -> ApiResultDto<GrantStaffPermissionsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    staff_permissions_service::grant_staff_permissions(req)
        .map(|()| GrantStaffPermissionsResponse {})
        .into()
}

// Clear a user's staff permission bitmask. Idempotent: revoking a non-
// staff user is a no-op success. Same controller gate as grant.
#[update]
fn revoke_staff_permissions(
    req: RevokeStaffPermissionsRequest,
) -> ApiResultDto<RevokeStaffPermissionsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    staff_permissions_service::revoke_staff_permissions(req)
        .map(|()| RevokeStaffPermissionsResponse {})
        .into()
}

// Admin-side projection of every staff user. Controller-gated: the staff
// roster is sensitive (it lists who has cross-org read or billing-write
// authority) and is never exposed to non-controllers.
#[query]
fn list_staff(_req: ListStaffRequest) -> ApiResultDto<ListStaffResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(staff_permissions_service::list_staff())
}
