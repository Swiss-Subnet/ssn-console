use crate::model::CyclesMetricsSnapshot;
use candid::Principal;
use canister_utils::ApiResult;

#[cfg(not(feature = "mock-metrics"))]
pub async fn get_canister_metrics(canister_id: Principal) -> ApiResult<CyclesMetricsSnapshot> {
    use crate::management_canister_types::{CanisterMetricsArgs, CanisterMetricsResult};
    use ic_cdk::call::Call;

    Call::unbounded_wait(Principal::management_canister(), "canister_metrics")
        .with_arg(&CanisterMetricsArgs { canister_id })
        .await
        .map_err(|err| {
            canister_utils::ApiError::dependency_error(format!(
                "Failed to call the `canister_metrics` management canister endpoint: {err:?}"
            ))
        })?
        .candid::<CanisterMetricsResult>()
        .map_err(|err| {
            canister_utils::ApiError::dependency_error(format!(
                "Failed to decode the candid response from the `canister_metrics` management canister endpoint: {err}"
            ))
        })
        .and_then(|res| {
            Ok(CyclesMetricsSnapshot {
                memory: res.cycles_consumed.memory.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert memory to u128".to_string()))?,
                compute_allocation: res.cycles_consumed.compute_allocation.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert compute_allocation to u128".to_string()))?,
                ingress_induction: res.cycles_consumed.ingress_induction.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert ingress_induction to u128".to_string()))?,
                instructions: res.cycles_consumed.instructions.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert instructions to u128".to_string()))?,
                request_and_response_transmission: res.cycles_consumed.request_and_response_transmission.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert request_and_response_transmission to u128".to_string()))?,
                uninstall: res.cycles_consumed.uninstall.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert uninstall to u128".to_string()))?,
                http_outcalls: res.cycles_consumed.http_outcalls.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert http_outcalls to u128".to_string()))?,
                burned_cycles: res.cycles_consumed.burned_cycles.0.try_into().map_err(|_| canister_utils::ApiError::internal_error("Failed to convert burned_cycles to u128".to_string()))?,
            })
        })
}

#[cfg(feature = "mock-metrics")]
pub async fn get_canister_metrics(canister_id: Principal) -> ApiResult<CyclesMetricsSnapshot> {
    use crate::repository;
    use canister_utils::with_random_bytes;

    let mut snapshot =
        repository::get_latest_snapshot(canister_id).unwrap_or(CyclesMetricsSnapshot {
            memory: 0,
            compute_allocation: 0,
            ingress_induction: 0,
            instructions: 0,
            request_and_response_transmission: 0,
            uninstall: 0,
            http_outcalls: 0,
            burned_cycles: 0,
        });

    // Request 40 random bytes:
    // First 8 bytes are used as boolean toggles to decide whether to increment each attribute
    // The next 32 bytes are grouped into 8 chunks of 4 bytes (u32) for the increment amounts.
    with_random_bytes::<40, _>(|bytes| {
        let should_increment = &bytes[0..8];
        let increments = &bytes[8..40];

        if should_increment[0] % 2 == 0 {
            snapshot.memory += u32::from_le_bytes(increments[0..4].try_into().unwrap()) as u128;
        }
        if should_increment[1] % 2 == 0 {
            snapshot.compute_allocation +=
                u32::from_le_bytes(increments[4..8].try_into().unwrap()) as u128;
        }
        if should_increment[2] % 2 == 0 {
            snapshot.ingress_induction +=
                u32::from_le_bytes(increments[8..12].try_into().unwrap()) as u128;
        }
        if should_increment[3] % 2 == 0 {
            snapshot.instructions +=
                u32::from_le_bytes(increments[12..16].try_into().unwrap()) as u128;
        }
        if should_increment[4] % 2 == 0 {
            snapshot.request_and_response_transmission +=
                u32::from_le_bytes(increments[16..20].try_into().unwrap()) as u128;
        }
        if should_increment[5] % 2 == 0 {
            snapshot.uninstall +=
                u32::from_le_bytes(increments[20..24].try_into().unwrap()) as u128;
        }
        if should_increment[6] % 2 == 0 {
            snapshot.http_outcalls +=
                u32::from_le_bytes(increments[24..28].try_into().unwrap()) as u128;
        }
        if should_increment[7] % 2 == 0 {
            snapshot.burned_cycles +=
                u32::from_le_bytes(increments[28..32].try_into().unwrap()) as u128;
        }

        Ok(snapshot)
    })
}
