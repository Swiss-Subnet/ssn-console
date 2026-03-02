use crate::dto::ListMyTeamsResponse;
use crate::{
    data::{team_repository, user_profile_repository},
    mapping::map_list_my_teams_response,
};
use candid::Principal;
use canister_utils::ApiResult;

pub fn list_my_teams(caller: Principal) -> ApiResult<ListMyTeamsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let teams = team_repository::list_user_teams(user_id);
    Ok(map_list_my_teams_response(teams))
}
