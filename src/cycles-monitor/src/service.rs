use crate::{
    dto::{ListMetricsAfterRequest, ListMetricsAfterResponse},
    env, management_canister_mock, repository,
};
use candid::Principal;
use canister_history_api::{ListSubnetCanisterIdsRequest, ListSubnetCanisterIdsResponse};
use canister_utils::{
    ApiError, ApiResult, ApiResultDto, CanisterId, CanisterIdRange, MAX_CALLS_PER_BATCH,
};
use futures::future::join_all;
use ic_cdk::call::Call;

pub fn list_metrics_after(req: ListMetricsAfterRequest, limit: usize) -> ListMetricsAfterResponse {
    let (snapshots, next_cursor) = repository::list_snapshots_after(req.cursor, limit);

    ListMetricsAfterResponse {
        snapshots,
        next_cursor,
    }
}

pub async fn sync_canister_metrics() -> ApiResult<()> {
    let canister_id_ranges = get_subnet_canister_ids().await?;

    for (start_principal, end_principal) in canister_id_ranges {
        let start_id = CanisterId::try_from(start_principal)
            .map_err(|e| ApiError::internal_error(e.to_string()))?;
        let end_id = CanisterId::try_from(end_principal)
            .map_err(|e| ApiError::internal_error(e.to_string()))?;

        let mut canister_id_range = CanisterIdRange::new((start_id, end_id));

        loop {
            let batch: Vec<CanisterId> = canister_id_range
                .by_ref()
                .take(MAX_CALLS_PER_BATCH)
                .collect();
            if batch.is_empty() {
                break;
            }

            let futures = batch
                .into_iter()
                .map(|canister_id| async move { process_canister_metrics(canister_id).await });

            let results = join_all(futures).await;
            for result in results {
                if let Err(e) = result {
                    ic_cdk::println!("Error processing canister metrics: {:?}", e);
                }
            }
        }
    }

    Ok(())
}

async fn process_canister_metrics(canister_id: CanisterId) -> ApiResult<()> {
    let principal = Principal::from(canister_id);

    let snapshot = management_canister_mock::get_canister_metrics(principal).await;
    let now_nanos = ic_cdk::api::time();
    repository::insert_snapshot(now_nanos, principal, snapshot);
    Ok(())
}

async fn get_subnet_canister_ids() -> ApiResult<Vec<(Principal, Principal)>> {
    let canister_history_id = env::get_canister_history_id();

    let req = ListSubnetCanisterIdsRequest {};
    let res = Call::unbounded_wait(canister_history_id, "list_subnet_canister_ids")
        .with_arg(req)
        .await
        .map_err(|err| {
            ApiError::dependency_error(format!("Failed to call list_subnet_canister_ids: {err:?}"))
        })?
        .candid::<ApiResultDto<ListSubnetCanisterIdsResponse>>()
        .map_err(|e| ApiError::internal_error(format!("Failed to decode response: {e}")))?;

    match res {
        ApiResultDto::Err(err) => Err(ApiError::dependency_error(err.message().to_string())),
        ApiResultDto::Ok(res) => Ok(res.canister_id_ranges),
    }
}
