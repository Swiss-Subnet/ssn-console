use crate::{
    data::{Canister, canister_repository, user_profile_repository},
    dto::{CreateCanisterResponse, ListCanistersResponse, ListMyCanistersResponse},
    mapping::{map_create_canister_response, map_list_canisters_response, map_list_my_canisters_response},
};
use candid::Principal;
use ic_cdk::management_canister::{self, CanisterSettings, CreateCanisterArgs};

pub fn list_canisters() -> ListCanistersResponse {
    let canisters = canister_repository::list_canisters();
    map_list_canisters_response(canisters)
}

pub fn list_my_canisters(calling_principal: Principal) -> Result<ListMyCanistersResponse, String> {
    let Some(user_id) = user_profile_repository::get_user_id_by_principal(&calling_principal)
    else {
        return Err(format!(
            "User profile for principal {} does not exist",
            calling_principal.to_text()
        ));
    };

    let canisters = canister_repository::list_canisters_by_user(user_id);
    Ok(map_list_my_canisters_response(canisters))
}

pub async fn create_canister(
    calling_principal: Principal,
) -> Result<CreateCanisterResponse, String> {
    let Some(user_id) = user_profile_repository::get_user_id_by_principal(&calling_principal)
    else {
        return Err(format!(
            "User profile for principal {} does not exist",
            calling_principal.to_text()
        ));
    };

    let create_canister_args = CreateCanisterArgs {
        settings: Some(CanisterSettings {
            controllers: Some(vec![calling_principal]),
            ..Default::default()
        }),
    };
    let result = management_canister::create_canister(&create_canister_args)
        .await
        .map_err(|err| {
            format!("Failed to create canister via management canister, message: {err}")
        })?;

    let canister = Canister {
        principal: result.canister_id,
    };
    let canister_id = canister_repository::create_canister(user_id, canister.clone());

    Ok(map_create_canister_response(canister_id, canister))
}
