use crate::{
    dto::ListMyCanistersResponse,
    service::{access_control_service, canister_service},
};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn list_my_canisters() -> ListMyCanistersResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match canister_service::list_my_canisters(calling_principal).await {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
