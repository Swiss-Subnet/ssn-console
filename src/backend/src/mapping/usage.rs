use crate::{data, dto};

pub fn map_project_usage_dto(usage: data::ProjectUsage) -> dto::ProjectUsage {
    dto::ProjectUsage {
        memory: usage.memory,
        memory_bytes: usage.memory_bytes,
        compute_allocation: usage.compute_allocation,
        compute_allocation_percent: usage.compute_allocation_percent,
        ingress_induction: usage.ingress_induction,
        ingress_induction_bytes_total: usage.ingress_induction_bytes_total,
        instructions: usage.instructions,
        compute_time_seconds_total: usage.compute_time_seconds_total,
        request_and_response_transmission: usage.request_and_response_transmission,
        transmission_bytes_total: usage.transmission_bytes_total,
        uninstall: usage.uninstall,
        uninstalls_total: usage.uninstalls_total,
        http_outcalls: usage.http_outcalls,
        burned_cycles: usage.burned_cycles,
    }
}

pub fn map_canister_usage_dto(usage: data::CanisterUsage) -> dto::CanisterUsage {
    dto::CanisterUsage {
        canister_id: usage.canister_id,
        memory: usage.memory,
        memory_bytes: usage.memory_bytes,
        compute_allocation: usage.compute_allocation,
        compute_allocation_percent: usage.compute_allocation_percent,
        ingress_induction: usage.ingress_induction,
        ingress_induction_bytes_total: usage.ingress_induction_bytes_total,
        instructions: usage.instructions,
        compute_time_seconds_total: usage.compute_time_seconds_total,
        request_and_response_transmission: usage.request_and_response_transmission,
        transmission_bytes_total: usage.transmission_bytes_total,
        uninstall: usage.uninstall,
        uninstalls_total: usage.uninstalls_total,
        http_outcalls: usage.http_outcalls,
        burned_cycles: usage.burned_cycles,
    }
}

pub fn map_canister_usage_data(usage: dto::CanisterUsage) -> data::CanisterUsage {
    data::CanisterUsage {
        canister_id: usage.canister_id,
        memory: usage.memory,
        memory_bytes: usage.memory_bytes,
        compute_allocation: usage.compute_allocation,
        compute_allocation_percent: usage.compute_allocation_percent,
        ingress_induction: usage.ingress_induction,
        ingress_induction_bytes_total: usage.ingress_induction_bytes_total,
        instructions: usage.instructions,
        compute_time_seconds_total: usage.compute_time_seconds_total,
        request_and_response_transmission: usage.request_and_response_transmission,
        transmission_bytes_total: usage.transmission_bytes_total,
        uninstall: usage.uninstall,
        uninstalls_total: usage.uninstalls_total,
        http_outcalls: usage.http_outcalls,
        burned_cycles: usage.burned_cycles,
    }
}
