use crate::dto::ListMyOrganizationsResponse;
use crate::{
    data::{organization_repository, user_profile_repository},
    mapping::map_list_my_organizations_response,
};
use candid::Principal;

pub fn init() {
    let user_ids = user_profile_repository::list_user_ids();

    for user_id in user_ids {
        organization_repository::add_default_org(user_id);
    }
}

pub fn list_user_orgs(calling_principal: Principal) -> Result<ListMyOrganizationsResponse, String> {
    let user_id = user_profile_repository::get_user_id_by_principal(&calling_principal)
        .ok_or_else(|| {
            format!(
                "User profile for principal {} does not exist",
                calling_principal
            )
        })?;

    let organizations = organization_repository::list_user_orgs(user_id);
    Ok(map_list_my_organizations_response(organizations))
}
