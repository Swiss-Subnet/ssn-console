use crate::{
    data::{
        canister_repository,
        memory::{
            init_canister_usage, init_project_usage, CanisterUsageMemory, ProjectUsageMemory,
        },
        BillingMonth, CanisterUsage, ProjectUsage,
    },
    dto,
    mapping::usage::map_canister_usage_data,
};
use candid::Principal;
use canister_utils::Uuid;
use std::cell::RefCell;

struct State {
    canister_usage: CanisterUsageMemory,
    project_usage: ProjectUsageMemory,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State {
        canister_usage: init_canister_usage(),
        project_usage: init_project_usage(),
    });
}

pub fn upsert_canister_usages(billing_month: String, usages: Vec<dto::CanisterUsage>) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        for usage in usages {
            let Some(project_id) =
                canister_repository::get_canister_by_principal(usage.canister_id)
                    .and_then(canister_repository::get_canister_project_id)
            else {
                ic_cdk::println!("Warning, tried to upsert usage for canister with ID {:?} but it does not exist", usage.canister_id);
                continue;
            };

            let current_canister_usage = map_canister_usage_data(usage.clone());
            let prev_canister_usage = s
                .canister_usage
                .get(&(usage.canister_id, BillingMonth::new(billing_month.clone())))
                .unwrap_or(CanisterUsage {
                    canister_id: usage.canister_id,
                    memory: 0,
                    memory_bytes: 0,
                    compute_allocation: 0,
                    compute_allocation_percent: 0,
                    ingress_induction: 0,
                    ingress_induction_bytes_total: 0,
                    instructions: 0,
                    compute_time_seconds_total: 0,
                    request_and_response_transmission: 0,
                    transmission_bytes_total: 0,
                    uninstall: 0,
                    uninstalls_total: 0,
                    http_outcalls: 0,
                    burned_cycles: 0,
                });

            let mut project_usage = s
                .project_usage
                .get(&(project_id, BillingMonth::new(billing_month.clone())))
                .unwrap_or_default();

            project_usage.memory = project_usage
                .memory
                .saturating_add(current_canister_usage.memory)
                .saturating_sub(prev_canister_usage.memory);
            project_usage.memory_bytes = project_usage
                .memory_bytes
                .saturating_add(current_canister_usage.memory_bytes)
                .saturating_sub(prev_canister_usage.memory_bytes);

            project_usage.compute_allocation = project_usage
                .compute_allocation
                .saturating_add(current_canister_usage.compute_allocation)
                .saturating_sub(prev_canister_usage.compute_allocation);
            project_usage.compute_allocation_percent = project_usage
                .compute_allocation_percent
                .saturating_add(current_canister_usage.compute_allocation_percent)
                .saturating_sub(prev_canister_usage.compute_allocation_percent);

            project_usage.ingress_induction = project_usage
                .ingress_induction
                .saturating_add(current_canister_usage.ingress_induction)
                .saturating_sub(prev_canister_usage.ingress_induction);
            project_usage.ingress_induction_bytes_total = project_usage
                .ingress_induction_bytes_total
                .saturating_add(current_canister_usage.ingress_induction_bytes_total)
                .saturating_sub(prev_canister_usage.ingress_induction_bytes_total);

            project_usage.instructions = project_usage
                .instructions
                .saturating_add(current_canister_usage.instructions)
                .saturating_sub(prev_canister_usage.instructions);
            project_usage.compute_time_seconds_total = project_usage
                .compute_time_seconds_total
                .saturating_add(current_canister_usage.compute_time_seconds_total)
                .saturating_sub(prev_canister_usage.compute_time_seconds_total);

            project_usage.request_and_response_transmission = project_usage
                .request_and_response_transmission
                .saturating_add(current_canister_usage.request_and_response_transmission)
                .saturating_sub(prev_canister_usage.request_and_response_transmission);
            project_usage.transmission_bytes_total = project_usage
                .transmission_bytes_total
                .saturating_add(current_canister_usage.transmission_bytes_total)
                .saturating_sub(prev_canister_usage.transmission_bytes_total);

            project_usage.uninstall = project_usage
                .uninstall
                .saturating_add(current_canister_usage.uninstall)
                .saturating_sub(prev_canister_usage.uninstall);
            project_usage.uninstalls_total = project_usage
                .uninstalls_total
                .saturating_add(current_canister_usage.uninstalls_total)
                .saturating_sub(prev_canister_usage.uninstalls_total);

            project_usage.http_outcalls = project_usage
                .http_outcalls
                .saturating_add(current_canister_usage.http_outcalls)
                .saturating_sub(prev_canister_usage.http_outcalls);

            project_usage.burned_cycles = project_usage
                .burned_cycles
                .saturating_add(current_canister_usage.burned_cycles)
                .saturating_sub(prev_canister_usage.burned_cycles);

            s.project_usage
                .insert((project_id, BillingMonth::new(billing_month.clone())), project_usage);

            s.canister_usage.insert(
                (usage.canister_id, BillingMonth::new(billing_month.clone())),
                map_canister_usage_data(usage),
            );
        }
    });
}

pub fn get_canister_usage(canister_id: Principal, billing_month: &str) -> CanisterUsage {
    STATE.with(|s| {
        s.borrow()
            .canister_usage
            .get(&(canister_id, BillingMonth::new(billing_month.to_string())))
            .unwrap_or(CanisterUsage {
                canister_id,
                memory: 0,
                memory_bytes: 0,
                compute_allocation: 0,
                compute_allocation_percent: 0,
                ingress_induction: 0,
                ingress_induction_bytes_total: 0,
                instructions: 0,
                compute_time_seconds_total: 0,
                request_and_response_transmission: 0,
                transmission_bytes_total: 0,
                uninstall: 0,
                uninstalls_total: 0,
                http_outcalls: 0,
                burned_cycles: 0,
            })
    })
}

pub fn get_project_usage(project_id: Uuid, billing_month: &str) -> ProjectUsage {
    STATE.with(|s| {
        s.borrow()
            .project_usage
            .get(&(project_id, BillingMonth::new(billing_month.to_string())))
            .unwrap_or_default()
    })
}
