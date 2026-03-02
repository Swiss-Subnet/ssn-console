use crate::dto::{
    CreateCanisterArgs, CreateCanisterError, CreateCanisterResult, CreateCanisterSuccess,
};
use candid::{Nat, Principal};
use ic_cdk::management_canister;

pub async fn create_canister(caller: Principal, args: CreateCanisterArgs) -> CreateCanisterResult {
    let create_canister_settings = args
        .creation_args
        .and_then(|creation_args| creation_args.settings)
        .map_or_else(
            || management_canister::CanisterSettings {
                controllers: Some(vec![caller]),
                ..Default::default()
            },
            |mut settings| {
                settings.controllers = settings.controllers.or_else(|| Some(vec![caller]));

                settings
            },
        );
    let create_canister_args = management_canister::CreateCanisterArgs {
        settings: Some(create_canister_settings),
    };

    let result = match management_canister::create_canister(&create_canister_args).await {
        Ok(res) => res,
        Err(err) => {
            return CreateCanisterResult::Err(CreateCanisterError::FailedToCreate {
                fee_block: None,
                refund_block: None,
                error: format!("Failed to create canister via management canister, message: {err}"),
            });
        }
    };

    CreateCanisterResult::Ok(CreateCanisterSuccess {
        block_id: Nat::from(0u64),
        canister_id: result.canister_id,
    })
}
