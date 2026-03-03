use crate::{
    data::{project_repository, team_repository, user_profile_repository},
    dto::ListMyProjectsResponse,
    mapping::map_list_my_projects_response,
};
use candid::Principal;
use canister_utils::ApiResult;

pub fn list_my_projects(caller: Principal) -> ApiResult<ListMyProjectsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let team_ids = team_repository::list_user_team_ids(user_id);
    let projects = project_repository::list_team_projects(&team_ids);

    Ok(map_list_my_projects_response(projects))
}
