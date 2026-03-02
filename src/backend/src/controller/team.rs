use crate::{dto::ListMyTeamsResponse, service::team_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_teams() -> ApiResultDto<ListMyTeamsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    team_service::list_my_teams(caller).into()
}
