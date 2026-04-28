use crate::{model::CyclesMetricsSnapshot, repository::get_latest_snapshot};
use candid::Principal;
use canister_utils::with_random_bytes;

pub async fn get_canister_metrics(canister_id: Principal) -> CyclesMetricsSnapshot {
    let mut snapshot = get_latest_snapshot(canister_id).unwrap_or(CyclesMetricsSnapshot {
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

        snapshot
    })
}
