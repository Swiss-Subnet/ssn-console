use crate::{data, dto};

pub fn map_usage_dto(usage: data::CanisterUsage) -> dto::CanisterUsage {
    dto::CanisterUsage {
        canister_id: usage.canister_id,
        month: usage.month,
        memory: usage.memory,
        compute_allocation: usage.compute_allocation,
        ingress_induction: usage.ingress_induction,
        instructions: usage.instructions,
        request_and_response_transmission: usage.request_and_response_transmission,
        uninstall: usage.uninstall,
        http_outcalls: usage.http_outcalls,
        burned_cycles: usage.burned_cycles,
    }
}

pub fn map_usage_data(usage: dto::CanisterUsage) -> data::CanisterUsage {
    data::CanisterUsage {
        canister_id: usage.canister_id,
        month: usage.month,
        memory: usage.memory,
        compute_allocation: usage.compute_allocation,
        ingress_induction: usage.ingress_induction,
        instructions: usage.instructions,
        request_and_response_transmission: usage.request_and_response_transmission,
        uninstall: usage.uninstall,
        http_outcalls: usage.http_outcalls,
        burned_cycles: usage.burned_cycles,
    }
}
