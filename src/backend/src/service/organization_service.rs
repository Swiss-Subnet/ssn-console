use crate::dto::ListMyOrganizationsResponse;
use crate::{
    data::{organization_repository, user_profile_repository},
    mapping::map_list_my_organizations_response,
};
use candid::Principal;
use canister_utils::ApiResult;

pub fn list_my_organizations(caller: Principal) -> ApiResult<ListMyOrganizationsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let organizations = organization_repository::list_user_orgs(user_id);
    Ok(map_list_my_organizations_response(organizations))
}
