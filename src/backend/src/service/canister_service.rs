use crate::{
    data::{
        canister_repository, project_repository, team_repository, user_profile_repository, Canister,
    },
    dto::ListMyCanistersResponse,
    mapping::map_canister_response,
};
use candid::Principal;
use canister_utils::Uuid;
use futures::future::join_all;
use ic_cdk::{
    api::canister_self,
    management_canister::{
        self, CanisterSettings, CanisterStatusArgs, CreateCanisterArgs, UpdateSettingsArgs,
    },
};

/// This number should not exceed the length of the canister output queue, which
/// is currently 500.
const CALLS_PER_BATCH: usize = 490;

pub async fn list_my_canisters(
    calling_principal: Principal,
) -> Result<ListMyCanistersResponse, String> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&calling_principal)?;

    let team_id = team_repository::list_user_team_ids(user_id)
        .first()
        .cloned()
        .ok_or("User does not have a default team.")?;

    let project_id = project_repository::list_team_project_ids(team_id)
        .first()
        .cloned()
        .ok_or("User's default team does not have a default project.")?;

    let project_canisters = canister_repository::list_canisters_by_project(project_id);
    let mut canisters = vec![];

    for chunk in project_canisters.chunks(CALLS_PER_BATCH) {
        let canister_futures = chunk.iter().map(|(id, canister)| async move {
            match management_canister::canister_status(&CanisterStatusArgs {
                canister_id: canister.principal,
            })
            .await
            {
                Ok(res) => map_canister_response(id, canister, Some(res)),
                Err(_) => map_canister_response(id, canister, None),
            }
        });

        canisters.extend(join_all(canister_futures).await);
    }

    Ok(canisters)
}

pub async fn create_my_canister(project_id: Uuid) -> Result<(), String> {
    let create_canister_args = CreateCanisterArgs {
        settings: Some(CanisterSettings {
            controllers: Some(vec![canister_self()]),
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
    canister_repository::create_canister(project_id, canister.clone());

    Ok(())
}

pub async fn add_canister_controller(
    canister_id: Principal,
    controller_id: Principal,
) -> Result<(), String> {
    let canister_status = management_canister::canister_status(&CanisterStatusArgs { canister_id })
        .await
        .map_err(|err| {
            format!("Failed to get canister_status for canister {canister_id}: {err}")
        })?;

    let mut controllers = canister_status.settings.controllers;
    if controllers.contains(&controller_id) {
        return Err(format!(
            "Controller {controller_id} is already a controller of canister {canister_id}"
        ));
    }

    controllers.push(controller_id);

    management_canister::update_settings(&UpdateSettingsArgs {
        canister_id,
        settings: CanisterSettings {
            controllers: Some(controllers),
            ..Default::default()
        },
    })
    .await
    .map_err(|err| format!("Failed to set controllers for canister {canister_id}: {err}"))?;

    Ok(())
}
