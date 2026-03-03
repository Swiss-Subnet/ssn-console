use crate::{
    dto::{CreateCanisterArgs, CreateCanisterResult},
    service::{access_control_service, cycles_ledger_service},
};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn create_canister(args: CreateCanisterArgs) -> CreateCanisterResult {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_trusted_partner(&caller) {
        trap(err.message());
    }

    cycles_ledger_service::create_canister(caller, args).await
}
