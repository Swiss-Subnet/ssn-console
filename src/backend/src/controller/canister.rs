use crate::{
    dto::{CreateCanisterResponse, ListCanistersResponse, ListMyCanistersResponse},
    service::{access_control_service, canister_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_canisters() -> ListCanistersResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    canister_service::list_canisters()
}

#[query]
fn list_my_canisters() -> ListMyCanistersResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match canister_service::list_my_canisters(calling_principal) {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}

#[update]
async fn create_my_canister() -> CreateCanisterResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_accepted_terms_of_service(&calling_principal) {
        trap(&err);
    }

    match canister_service::create_my_canister(calling_principal).await {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
