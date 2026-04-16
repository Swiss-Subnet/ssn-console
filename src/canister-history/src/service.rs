use crate::canister_id::CanisterId;
use crate::constants::{
    CHANGES_TO_REQUEST, DEFAULT_PAGINATION_LIMIT, DEFAULT_PAGINATION_PAGE, MAX_CALLS_PER_BATCH,
    MAX_PAGINATION_LIMIT, MIN_PAGINATION_LIMIT, MIN_PAGINATION_PAGE,
};
use crate::dto::{
    ListCanisterChangesRequest, ListCanisterChangesResponse, ListSubnetCanisterIdsRequest,
    ListSubnetCanisterIdsResponse, ListSubnetCanisterRangesResponse, PaginationMetaResponse,
    UpdateSubnetCanisterRangesRequest,
};
use crate::mapping::map_canister_change_response;
use crate::model::CanisterChangeInfo;
use crate::repository;
use crate::{canister_id::CanisterIdRange, mapping::map_management_canister_change_response};
use candid::Principal;
use canister_utils::{call::is_destination_invalid, ApiError, ApiResult};
use futures::future::join_all;
use ic_cdk::{
    call::{Call, CallFailed},
    management_canister::{CanisterInfoArgs, CanisterInfoResult},
};

pub fn update_subnet_canister_ranges(req: UpdateSubnetCanisterRangesRequest) {
    repository::update_subnet_canister_ranges(req.canister_ranges);
}

pub fn list_subnet_canister_ranges() -> ListSubnetCanisterRangesResponse {
    ListSubnetCanisterRangesResponse {
        canister_ranges: repository::list_subnet_canister_ranges(),
    }
}

pub fn list_subnet_canister_ids(
    req: ListSubnetCanisterIdsRequest,
) -> ListSubnetCanisterIdsResponse {
    let limit = req
        .limit
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    let page = req.page.unwrap_or(DEFAULT_PAGINATION_PAGE);

    let total_items = repository::get_subnet_canister_ids_count();
    let total_pages = total_items.div_ceil(limit).max(MIN_PAGINATION_PAGE);
    let page = page.clamp(MIN_PAGINATION_PAGE, total_pages);

    let canister_ids = repository::list_subnet_canister_ids(limit as usize, page as usize);

    ListSubnetCanisterIdsResponse {
        canister_ids,
        meta: PaginationMetaResponse {
            limit,
            page,
            total_items,
            total_pages,
        },
    }
}

pub fn list_canister_changes(req: ListCanisterChangesRequest) -> ListCanisterChangesResponse {
    let reverse = req.reverse.unwrap_or(false);
    let limit = req
        .limit
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    let page = req.page.unwrap_or(DEFAULT_PAGINATION_PAGE);

    let total_items = repository::get_canister_changes_count(req.canister_id);
    let total_pages = total_items.div_ceil(limit).max(MIN_PAGINATION_PAGE);
    let page = page.clamp(MIN_PAGINATION_PAGE, total_pages);

    let changes =
        repository::list_canister_changes(req.canister_id, reverse, limit as usize, page as usize);

    let changes = changes
        .into_iter()
        .map(map_canister_change_response)
        .collect::<Vec<_>>();

    ListCanisterChangesResponse {
        changes,
        meta: PaginationMetaResponse {
            limit,
            page,
            total_items,
            total_pages,
        },
    }
}

pub async fn sync_canister_histories() -> ApiResult {
    let canister_ranges = repository::list_subnet_canister_ranges();

    for range in canister_ranges {
        let mut canister_id_range = CanisterIdRange::new((
            CanisterId::try_from(range.0).map_err(|err| {
                ApiError::internal_error(format!(
                    "Failed to convert stored subnet canister id range: {err}"
                ))
            })?,
            CanisterId::try_from(range.1).map_err(|err| {
                ApiError::internal_error(format!(
                    "Failed to convert stored subnet canister id range: {err}"
                ))
            })?,
        ));

        loop {
            let batch: Vec<CanisterId> = canister_id_range
                .by_ref()
                .take(MAX_CALLS_PER_BATCH)
                .collect();
            if batch.is_empty() {
                break;
            }

            let futures = batch.into_iter().map(|canister_id| async move {
                process_canister_changes(canister_id.into()).await
            });

            let mut num_consecutive_failed = 0;
            for result in join_all(futures).await {
                match result {
                    Err(_) => {
                        num_consecutive_failed += 1;
                    }
                    Ok(()) => num_consecutive_failed = 0,
                }
            }

            if num_consecutive_failed >= 100 {
                ic_cdk::println!("Warning: Found 100 consecutive failures, stopping.");
                break;
            }
        }
    }

    Ok(())
}

/// This function retrieves the latest changes for a canister, compares them with
/// previously stored changes, and inserts any new changes into the repository.
/// It also handles cases where changes may have been missed due to truncation.
async fn process_canister_changes(canister_id: Principal) -> ApiResult {
    let existing = repository::get_canister_change_info(canister_id);

    let mut stored_canister_info = existing.clone().unwrap_or_else(|| CanisterChangeInfo {
        total_num_changes: 0,
        stored_num_changes: 0,
        missed_ranges: vec![],
        is_deleted: false,
    });

    if stored_canister_info.is_deleted {
        return Ok(());
    }

    let canister_info = match get_canister_info(canister_id).await {
        Ok(info) => info,
        Err(GetCanisterInfoError::CanisterDeleted) => {
            if existing.is_some() {
                stored_canister_info.is_deleted = true;
                repository::upsert_canister_change_info(canister_id, stored_canister_info);
            }
            return Ok(());
        }
        Err(GetCanisterInfoError::Other(err)) => return Err(err),
    };

    // The starting index is the total number of changes ever, less than the
    // number of changes returned in this call
    let start_index = canister_info
        .total_num_changes
        .saturating_sub(canister_info.recent_changes.len() as u64);

    // If there's a gap between our starting index and the number of stored changes,
    // we missed some changes and need to record the range of changes that we missed
    if start_index > stored_canister_info.total_num_changes {
        let missed_events = start_index - stored_canister_info.total_num_changes;
        stored_canister_info
            .missed_ranges
            .push((stored_canister_info.total_num_changes, start_index));
        ic_cdk::println!("Warning: Missed {missed_events} events due to truncation");
    }

    for (i, change_record) in canister_info.recent_changes.into_iter().enumerate() {
        let current_index = start_index + i as u64;

        // Only process changes that haven't been stored yet
        if current_index >= stored_canister_info.total_num_changes {
            let canister_change =
                map_management_canister_change_response(canister_id, change_record);
            repository::insert_change(canister_change);
            stored_canister_info.stored_num_changes += 1;
        }
    }

    stored_canister_info.total_num_changes = canister_info.total_num_changes;
    repository::upsert_canister_change_info(canister_id, stored_canister_info);

    Ok(())
}

enum GetCanisterInfoError {
    CanisterDeleted,
    Other(ApiError),
}

async fn get_canister_info(
    canister_id: Principal,
) -> Result<CanisterInfoResult, GetCanisterInfoError> {
    Call::bounded_wait(Principal::management_canister(), "canister_info")
        .with_arg(&CanisterInfoArgs {
            canister_id,
            num_requested_changes: CHANGES_TO_REQUEST,
        })
        .await
        .map_err(|err| {
            if let CallFailed::CallRejected(rejected) = &err {
                if is_destination_invalid(rejected) {
                    return GetCanisterInfoError::CanisterDeleted;
                }
            }
            GetCanisterInfoError::Other(ApiError::dependency_error(format!(
                "Failed to call the `canister_info` management canister endpoint: {err}"
            )))
        })?
        .candid::<CanisterInfoResult>()
        .map_err(|err| {
            GetCanisterInfoError::Other(ApiError::dependency_error(format!(
                "Failed to decode the candid response from the `canister_info` management canister endpoint: {err}"
            )))
        })
}
