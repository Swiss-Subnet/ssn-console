use crate::{
    constants::{
        DEFAULT_PAGINATION_LIMIT, DEFAULT_PAGINATION_PAGE, MAX_PAGINATION_LIMIT,
        MIN_PAGINATION_LIMIT, MIN_PAGINATION_PAGE,
    },
    data::{
        canister_repository, organization_repository, orphaned_canister_repository,
        project_repository, team_repository, user_profile_repository, Canister, ProjectPermissions,
    },
    dto::{
        self, CanisterState, ListMyCanistersRequest, ListMyCanistersResponse,
        ListUserCanistersRequest, ListUserCanistersResponse, UpdateMyCanisterNameRequest,
    },
    mapping::{map_canister_info, map_canister_response},
    service::access_control_service::ProjectAuth,
    validation::CanisterName,
};
use candid::Principal;
use canister_utils::{is_destination_invalid, ApiError, ApiResult, Uuid, MAX_CALLS_PER_BATCH};
use futures::future::join_all;
use ic_cdk::{
    api::{canister_self, time},
    call::Error as CallError,
    management_canister::{
        self, CanisterSettings, CanisterStatusArgs, CreateCanisterArgs, UpdateSettingsArgs,
    },
};

pub async fn list_my_canisters(
    caller: Principal,
    request: ListMyCanistersRequest,
) -> ApiResult<ListMyCanistersResponse> {
    let project_id = request.project_id.as_str().try_into()?;
    let auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::EMPTY)?;
    let project_canisters =
        canister_repository::list_active_canisters_by_project(auth.project_id());
    Ok(fetch_canisters_with_state(project_canisters).await)
}

pub async fn list_user_canisters(
    request: ListUserCanistersRequest,
) -> ApiResult<ListUserCanistersResponse> {
    let user_id = request.user_id.as_str().try_into()?;
    let team_ids = team_repository::list_user_team_ids(user_id);

    let mut project_ids = team_ids
        .into_iter()
        .flat_map(project_repository::list_team_project_ids)
        .collect::<Vec<_>>();

    project_ids.sort();
    project_ids.dedup();

    let mut canisters = vec![];
    for project_id in project_ids {
        let project_canisters =
            canister_repository::list_canisters_by_project_including_deleted(project_id);
        canisters.extend(fetch_canisters_with_state(project_canisters).await);
    }

    Ok(ListUserCanistersResponse { canisters })
}

async fn fetch_canisters_with_state(
    project_canisters: Vec<(Uuid, Canister)>,
) -> Vec<dto::Canister> {
    let mut canisters = vec![];

    for chunk in project_canisters.chunks(MAX_CALLS_PER_BATCH) {
        let canister_futures = chunk.iter().map(|(id, canister)| async move {
            let state = fetch_canister_state(canister.principal).await;
            map_canister_response(id, canister, state)
        });

        canisters.extend(join_all(canister_futures).await);
    }

    canisters
}

async fn fetch_canister_state(canister_id: Principal) -> CanisterState {
    match management_canister::canister_status(&CanisterStatusArgs { canister_id }).await {
        Ok(info) => CanisterState::Accessible(Box::new(map_canister_info(info))),
        Err(err) => classify_canister_status_error(err),
    }
}

// ic-cdk 0.19 does not expose the numeric IC error code (IC0301, etc.) as a
// typed field. CallRejected only exposes reject_code() (the coarse RejectCode
// enum) and reject_message() (free text). The struct's own source comment
// confirms it: "Once we have ic0.msg_error_code system API, we will only store
// the error_code in this struct." So the underlying replica work is planned
// but not shipped yet -- see
// https://github.com/dfinity/ic/blob/ac5a702/packages/ic-error-types/src/lib.rs#L176
// (those constants exist on the replica side but aren't surfaced through the
// canister-side ic0 system API).
//
// Practically that leaves three options for distinguishing IC0301:
//   1. RejectCode::DestinationInvalid (what we use) -- coarse but type-safe.
//      The replica maps IC0301 to DestinationInvalid. False positives are
//      theoretically possible, but for a canister we recorded post-creation
//      this overwhelmingly means deleted.
//   2. String-match on reject_message() -- more precise, but brittle: messages
//      have changed across replica versions and there's no contract.
//   3. Both -- belt-and-braces.
//
// We stick with #1: a string check would depend on undocumented message text
// and the practical difference is near zero. When ic-cdk gains the error_code
// getter, swap this for error_code() == ErrorCode::CanisterNotFound.
//
// Other rejections (most commonly "not a controller") map to Inaccessible so
// the user can still recover via the missing-controller flow.
fn classify_canister_status_error(err: CallError) -> CanisterState {
    if let CallError::CallRejected(rejected) = &err {
        if is_destination_invalid(rejected) {
            return CanisterState::Deleted;
        }
    }
    CanisterState::Inaccessible
}

pub fn update_my_canister_name(
    caller: Principal,
    request: UpdateMyCanisterNameRequest,
) -> ApiResult<()> {
    let canister_id = Uuid::try_from(request.canister_id.as_str())?;
    let project_id = canister_repository::get_canister_project_id(canister_id)
        .ok_or_else(|| ApiError::client_error(format!("Canister {canister_id} not found.")))?;

    let _auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::CANISTER_MANAGE)?;

    let name = match request.name {
        Some(raw) => Some(CanisterName::try_from(raw)?.into_inner()),
        None => None,
    };

    canister_repository::update_canister_name(canister_id, name)
        .ok_or_else(|| ApiError::client_error(format!("Canister {canister_id} not found.")))?;

    Ok(())
}

pub fn remove_my_canister(caller: Principal, canister_id: Uuid) -> ApiResult<()> {
    let project_id = canister_repository::get_canister_project_id(canister_id)
        .ok_or_else(|| ApiError::client_error(format!("Canister {canister_id} not found.")))?;

    let auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::CANISTER_MANAGE)?;

    canister_repository::soft_delete_canister(auth.project_id(), canister_id, time()).ok_or_else(
        || {
            ApiError::client_error(format!(
                "Canister {canister_id} is not active in user's project (already removed?)."
            ))
        },
    )?;

    Ok(())
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
                    deleted_at: canister.deleted_at,
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
        name: None,
        deleted_at: None,
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

pub async fn add_child_canisters(
    request: dto::AddChildCanistersRequest,
) -> ApiResult<dto::AddChildCanistersResponse> {
    for mapping in request.parent_child_mappings {
        let child_principal = mapping.child_canister_id;
        let parent_principal = mapping.parent_canister_id;

        if canister_repository::get_canister_by_principal(child_principal).is_some()
            || orphaned_canister_repository::get_parent_by_child(child_principal).is_some()
        {
            continue;
        }

        // if the parent principal is equal to the backend canister, meaning
        // that the canister was created through the UI, then we will have
        // already found the canister in the canister_repository check above
        // and won't make it this far
        let parent_project_id = canister_repository::get_canister_by_principal(parent_principal)
            .and_then(canister_repository::get_canister_project_id);

        if let Some(project_id) = parent_project_id {
            canister_repository::create_canister(
                project_id,
                Canister {
                    name: None,
                    principal: child_principal,
                    deleted_at: None,
                },
            );

            // add any grand children that came in before this canister and were
            // erronously registered as orphans
            let mut stack = vec![child_principal];
            while let Some(parent) = stack.pop() {
                for child in orphaned_canister_repository::list_children_by_parent(parent) {
                    canister_repository::create_canister(
                        project_id,
                        Canister {
                            name: None,
                            principal: child,
                            deleted_at: None,
                        },
                    );
                    orphaned_canister_repository::remove_orphaned_canister(child, parent);
                    stack.push(child);
                }
            }
        } else {
            orphaned_canister_repository::create_orphaned_canister(
                child_principal,
                parent_principal,
            );
        }
    }

    Ok(dto::AddChildCanistersResponse {})
}
