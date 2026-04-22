use crate::{
    data,
    dto::{
        Canister, CanisterInfo, CanisterSettings, CanisterState, CanisterStatus,
        EnvironmentVariable, LogVisibility, MemoryMetrics, QueryStats,
    },
};
use canister_utils::Uuid;
use ic_cdk::management_canister::{self, CanisterStatusResult, CanisterStatusType};

pub fn map_canister_response(
    id: &Uuid,
    canister: &data::Canister,
    state: CanisterState,
) -> Canister {
    Canister {
        id: id.to_string(),
        principal_id: canister.principal.to_string(),
        name: canister.name.clone(),
        state,
    }
}

pub fn map_canister_info(info: CanisterStatusResult) -> CanisterInfo {
    CanisterInfo {
        status: match info.status {
            CanisterStatusType::Running => CanisterStatus::Running,
            CanisterStatusType::Stopping => CanisterStatus::Stopping,
            CanisterStatusType::Stopped => CanisterStatus::Stopped,
        },
        ready_for_migration: info.ready_for_migration,
        version: info.version,
        settings: CanisterSettings {
            controllers: info.settings.controllers,
            compute_allocation: info.settings.compute_allocation,
            memory_allocation: info.settings.memory_allocation,
            freezing_threshold: info.settings.freezing_threshold,
            reserved_cycles_limit: info.settings.reserved_cycles_limit,
            log_visibility: match info.settings.log_visibility {
                management_canister::LogVisibility::Controllers => LogVisibility::Controllers,
                management_canister::LogVisibility::Public => LogVisibility::Public,
                management_canister::LogVisibility::AllowedViewers(principals) => {
                    LogVisibility::AllowedViewers(principals)
                }
            },
            wasm_memory_limit: info.settings.wasm_memory_limit,
            wasm_memory_threshold: info.settings.wasm_memory_threshold,
            environment_variables: info
                .settings
                .environment_variables
                .into_iter()
                .map(|environment_variable| EnvironmentVariable {
                    name: environment_variable.name,
                    value: environment_variable.value,
                })
                .collect(),
        },
        module_hash: info.module_hash,
        memory_size: info.memory_size,
        memory_metrics: MemoryMetrics {
            wasm_memory_size: info.memory_metrics.wasm_memory_size,
            stable_memory_size: info.memory_metrics.stable_memory_size,
            global_memory_size: info.memory_metrics.global_memory_size,
            wasm_binary_size: info.memory_metrics.wasm_binary_size,
            custom_sections_size: info.memory_metrics.custom_sections_size,
            canister_history_size: info.memory_metrics.canister_history_size,
            wasm_chunk_store_size: info.memory_metrics.wasm_chunk_store_size,
            snapshots_size: info.memory_metrics.snapshots_size,
        },
        cycles: info.cycles,
        reserved_cycles: info.reserved_cycles,
        idle_cycles_burned_per_day: info.idle_cycles_burned_per_day,
        query_stats: QueryStats {
            num_calls_total: info.query_stats.num_calls_total,
            num_instructions_total: info.query_stats.num_instructions_total,
            request_payload_bytes_total: info.query_stats.request_payload_bytes_total,
            response_payload_bytes_total: info.query_stats.response_payload_bytes_total,
        },
    }
}
