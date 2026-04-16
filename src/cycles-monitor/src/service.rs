use crate::dto::{CyclesConsumedResponse, GetCanisterMetricsRequest, GetCanisterMetricsResponse};
use candid::Nat;
use canister_utils::ApiResult;

pub async fn sync_canister_cycles() -> ApiResult<()> {
    Ok(())
}

pub async fn get_canister_metrics(
    _req: GetCanisterMetricsRequest,
) -> ApiResult<GetCanisterMetricsResponse> {
    Ok(GetCanisterMetricsResponse {
        cycles_consumed: CyclesConsumedResponse {
            memory: Nat::from(1_000_000u64),
            compute_allocation: Nat::from(500_000u64),
            ingress_induction: Nat::from(200_000u64),
            instructions: Nat::from(300_000u64),
            request_and_response_transmission: Nat::from(150_000u64),
            uninstall: Nat::from(50_000u64),
            canister_creation: Nat::from(100_000u64),
            http_outcalls: Nat::from(75_000u64),
            burned_cycles: Nat::from(25_000u64),
        },
    })
}
