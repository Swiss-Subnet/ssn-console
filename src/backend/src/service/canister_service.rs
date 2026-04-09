use crate::{
    constants::{
        DEFAULT_PAGINATION_LIMIT, DEFAULT_PAGINATION_PAGE, MAX_CALLS_PER_BATCH,
        MAX_PAGINATION_LIMIT, MIN_PAGINATION_LIMIT, MIN_PAGINATION_PAGE,
    },
    data::{
        canister_repository, organization_repository, project_repository, team_repository,
        user_profile_repository, Canister,
    },
    dto::{self},
    mapping::map_canister_response,
};
use candid::Principal;
use canister_utils::{ApiResult, Uuid};
use futures::future::join_all;
use ic_cdk::{
    api::canister_self,
    management_canister::{
        self, CanisterSettings, CanisterStatusArgs, CreateCanisterArgs, UpdateSettingsArgs,
    },
};

pub fn migrate_project_canister_count() {
    canister_repository::migrate_project_canister_count();
}

pub async fn list_project_canisters(
    caller: &Principal,
    project_id: &str,
    limit: Option<u64>,
    page: Option<u64>,
) -> ApiResult<dto::ListProjectCanistersResponse> {
    let project_id = Uuid::try_from(project_id)?;

    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    project_repository::assert_any_team_has_project(&user_id, &team_ids, project_id)?;

    let limit = limit
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    let page = page.unwrap_or(DEFAULT_PAGINATION_PAGE);

    let total_items = canister_repository::get_project_canister_count(project_id);
    let total_pages = total_items.div_ceil(limit).max(MIN_PAGINATION_PAGE);
    let page = page.clamp(MIN_PAGINATION_PAGE, total_pages);

    let project_canisters =
        canister_repository::list_canisters_by_project(project_id, limit as usize, page as usize);
    let mut canisters = vec![];

    for chunk in project_canisters.chunks(MAX_CALLS_PER_BATCH) {
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

    Ok(dto::ListProjectCanistersResponse {
        canisters,
        meta: dto::PaginationMetaResponse {
            limit,
            page,
            total_items,
            total_pages,
        },
    })
}

pub fn list_all_canisters(
    limit: Option<u64>,
    page: Option<u64>,
) -> ApiResult<dto::ListAllCanistersResponse> {
    let limit = limit
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    let page = page.unwrap_or(DEFAULT_PAGINATION_PAGE);

    let total_items = canister_repository::get_canister_count();
    let total_pages = total_items.div_ceil(limit).max(MIN_PAGINATION_PAGE);
    let page = page.clamp(MIN_PAGINATION_PAGE, total_pages);

    let canisters = canister_repository::list_canisters_with_project(limit as usize, page as usize)
        .iter()
        .flat_map(|(canister_id, canister, project_id)| {
            project_repository::get_project(project_id)
                .map(|project| organization_repository::list_org_users(project.org_id))
                .and_then(|org_users| org_users.first().cloned())
                .and_then(|org_owner_id| {
                    user_profile_repository::get_user_profile_by_user_id(&org_owner_id)
                        .map(|org_owner| (org_owner_id, org_owner))
                })
                .map(|(org_owner_id, org_owner)| dto::CanisterWithOwner {
                    id: canister_id.to_string(),
                    principal_id: canister.principal.to_text(),
                    user_id: org_owner_id.to_string(),
                    email: org_owner.email,
                })
        })
        .collect::<Vec<_>>();

    Ok(dto::ListAllCanistersResponse {
        canisters,
        meta: dto::PaginationMetaResponse {
            limit,
            page,
            total_items,
            total_pages,
        },
    })
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
