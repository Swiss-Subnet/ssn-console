use crate::{
    dto::ListMyTeamsResponse,
    service::{access_control_service, team_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_teams() -> ListMyTeamsResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match team_service::list_my_teams(calling_principal) {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
