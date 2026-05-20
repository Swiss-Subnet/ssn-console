use crate::{
    data::{
        canister_repository,
        memory::{
            init_canister_month_project_index, init_canister_usage, init_project_usage,
            CanisterMonthProjectIndexMemory, CanisterUsageMemory, ProjectUsageMemory,
        },
        BillingMonth, Usage,
    },
    dto,
    mapping::usage::map_canister_usage_data,
};
use candid::Principal;
use canister_utils::{Uuid, MAX_PRINCIPAL, MIN_PRINCIPAL};
use std::cell::RefCell;

struct State {
    canister_usage: CanisterUsageMemory,
    project_usage: ProjectUsageMemory,
    canister_month_project_index: CanisterMonthProjectIndexMemory,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State {
        canister_usage: init_canister_usage(),
        project_usage: init_project_usage(),
        canister_month_project_index: init_canister_month_project_index(),
    });
}

pub fn upsert_canister_usages(billing_month: String, usages: Vec<dto::CanisterUsage>) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        for usage in usages {
            let project_id = if let Some(id) =
                canister_repository::get_canister_by_principal(usage.canister_id)
                    .and_then(canister_repository::get_canister_project_id)
            {
                id
            } else {
                ic_cdk::println!("Warning, tried to upsert usage for canister with ID {:?} but it does not exist", usage.canister_id);
                continue;
            };

            let current_canister_usage = map_canister_usage_data(usage.clone());
            let current_month_prev_project_id = s
                .canister_month_project_index
                .get(&(usage.canister_id, BillingMonth::new(billing_month.clone())))
                .unwrap_or(project_id);

            let prev_canister_usage = s
                .canister_usage
                .get(&(
                    current_month_prev_project_id,
                    BillingMonth::new(billing_month.clone()),
                    usage.canister_id,
                ))
                .unwrap_or_default();

            let mut project_usage = s
                .project_usage
                .get(&(project_id, BillingMonth::new(billing_month.clone())))
                .unwrap_or_default();

            let canister_usage_delta =
                calculate_usage_delta(&current_canister_usage, &prev_canister_usage);
            project_usage.memory = project_usage
                .memory
                .saturating_add(canister_usage_delta.memory);
            project_usage.memory_bytes = project_usage
                .memory_bytes
                .saturating_add(canister_usage_delta.memory_bytes);

            project_usage.compute_allocation = project_usage
                .compute_allocation
                .saturating_add(canister_usage_delta.compute_allocation);
            project_usage.compute_allocation_percent = project_usage
                .compute_allocation_percent
                .saturating_add(canister_usage_delta.compute_allocation_percent);

            project_usage.ingress_induction = project_usage
                .ingress_induction
                .saturating_add(canister_usage_delta.ingress_induction);
            project_usage.ingress_induction_bytes_total = project_usage
                .ingress_induction_bytes_total
                .saturating_add(canister_usage_delta.ingress_induction_bytes_total);

            project_usage.instructions = project_usage
                .instructions
                .saturating_add(canister_usage_delta.instructions);
            project_usage.compute_time_seconds_total = project_usage
                .compute_time_seconds_total
                .saturating_add(canister_usage_delta.compute_time_seconds_total);

            project_usage.request_and_response_transmission = project_usage
                .request_and_response_transmission
                .saturating_add(canister_usage_delta.request_and_response_transmission);
            project_usage.transmission_bytes_total = project_usage
                .transmission_bytes_total
                .saturating_add(canister_usage_delta.transmission_bytes_total);

            project_usage.uninstall = project_usage
                .uninstall
                .saturating_add(canister_usage_delta.uninstall);
            project_usage.uninstalls_total = project_usage
                .uninstalls_total
                .saturating_add(canister_usage_delta.uninstalls_total);

            project_usage.http_outcalls = project_usage
                .http_outcalls
                .saturating_add(canister_usage_delta.http_outcalls);

            project_usage.burned_cycles = project_usage
                .burned_cycles
                .saturating_add(canister_usage_delta.burned_cycles);

            s.project_usage.insert(
                (project_id, BillingMonth::new(billing_month.clone())),
                project_usage,
            );

            s.canister_month_project_index.insert(
                (usage.canister_id, BillingMonth::new(billing_month.clone())),
                project_id,
            );

            s.canister_usage.insert(
                (
                    project_id,
                    BillingMonth::new(billing_month.clone()),
                    usage.canister_id,
                ),
                map_canister_usage_data(usage),
            );
        }
    });
}

pub fn list_canister_usages_for_project(
    project_id: Uuid,
    billing_month: &str,
) -> Vec<(Principal, Usage)> {
    STATE.with(|s| {
        let s = s.borrow();
        let start = (
            project_id,
            BillingMonth::new(billing_month.to_string()),
            MIN_PRINCIPAL,
        );
        let end = (
            project_id,
            BillingMonth::new(billing_month.to_string()),
            MAX_PRINCIPAL,
        );

        let prev_month = BillingMonth::new(get_previous_billing_month(billing_month));
        s.canister_usage
            .range(start..=end)
            .map(|entry| entry.into_pair())
            .map(|((_project_id, _billing_month, canister_id), usage)| (canister_id, usage))
            .map(|(canister_id, usage)| {
                let prev_project_id = s
                    .canister_month_project_index
                    .get(&(canister_id, prev_month.clone()))
                    .unwrap_or(project_id);

                let prev_canister_usage = s
                    .canister_usage
                    .get(&(prev_project_id, prev_month.clone(), canister_id))
                    .unwrap_or_default();

                (
                    canister_id,
                    calculate_usage_delta(&usage, &prev_canister_usage),
                )
            })
            .collect()
    })
}

pub fn get_project_usage(project_id: Uuid, billing_month: &str) -> Usage {
    STATE.with(|s| {
        let mut current = s
            .borrow()
            .project_usage
            .get(&(project_id, BillingMonth::new(billing_month.to_string())))
            .unwrap_or_default();

        let prev_month = get_previous_billing_month(billing_month);

        if let Some(prev) = s
            .borrow()
            .project_usage
            .get(&(project_id, BillingMonth::new(prev_month.clone())))
        {
            current = calculate_usage_delta(&current, &prev);
        }

        current
    })
}

pub fn calculate_usage_delta(current: &Usage, prev: &Usage) -> Usage {
    Usage {
        memory: current.memory.saturating_sub(prev.memory),
        memory_bytes: current.memory_bytes.saturating_sub(prev.memory_bytes),
        compute_allocation: current
            .compute_allocation
            .saturating_sub(prev.compute_allocation),
        compute_allocation_percent: current
            .compute_allocation_percent
            .saturating_sub(prev.compute_allocation_percent),
        ingress_induction: current
            .ingress_induction
            .saturating_sub(prev.ingress_induction),
        ingress_induction_bytes_total: current
            .ingress_induction_bytes_total
            .saturating_sub(prev.ingress_induction_bytes_total),
        instructions: current.instructions.saturating_sub(prev.instructions),
        compute_time_seconds_total: current
            .compute_time_seconds_total
            .saturating_sub(prev.compute_time_seconds_total),
        request_and_response_transmission: current
            .request_and_response_transmission
            .saturating_sub(prev.request_and_response_transmission),
        transmission_bytes_total: current
            .transmission_bytes_total
            .saturating_sub(prev.transmission_bytes_total),
        uninstall: current.uninstall.saturating_sub(prev.uninstall),
        uninstalls_total: current
            .uninstalls_total
            .saturating_sub(prev.uninstalls_total),
        http_outcalls: current.http_outcalls.saturating_sub(prev.http_outcalls),
        burned_cycles: current.burned_cycles.saturating_sub(prev.burned_cycles),
    }
}

fn get_previous_billing_month(billing_month: &str) -> String {
    let mut parts = billing_month.split('-');
    let year: u32 = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let month: u32 = parts.next().unwrap_or("0").parse().unwrap_or(0);

    let (prev_year, prev_month) = if month == 1 {
        (year - 1, 12)
    } else {
        (year, month - 1)
    };

    format!("{:04}-{:02}", prev_year, prev_month)
}
