use crate::{
    data::{
        canister_repository,
        memory::{
            init_canister_absolute_usage, init_canister_month_project_index, init_canister_usage,
            init_project_usage, CanisterAbsoluteUsageMemory, CanisterMonthProjectIndexMemory,
            CanisterUsageMemory, ProjectUsageMemory,
        },
        BillingMonth, ProjectId, Usage,
    },
    dto,
    mapping::usage::map_canister_usage_data,
};
use candid::Principal;
use canister_utils::{MAX_PRINCIPAL, MIN_PRINCIPAL};
use std::cell::RefCell;

struct State {
    canister_usage: CanisterUsageMemory,
    project_usage: ProjectUsageMemory,
    canister_month_project_index: CanisterMonthProjectIndexMemory,
    canister_absolute_usage: CanisterAbsoluteUsageMemory,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State {
        canister_usage: init_canister_usage(),
        project_usage: init_project_usage(),
        canister_month_project_index: init_canister_month_project_index(),
        canister_absolute_usage: init_canister_absolute_usage(),
    });
}

pub fn upsert_canister_usages(billing_month: String, usages: Vec<dto::CanisterUsage>) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let current_month = BillingMonth::try_new(billing_month.clone()).unwrap();
        let prev_month = BillingMonth::try_new(get_previous_billing_month(&billing_month)).unwrap();

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

            // Get previous absolute usage (this month, or fallback to previous month)
            let prev_absolute_usage = s
                .canister_absolute_usage
                .get(&(usage.canister_id, current_month.clone()))
                .unwrap_or_else(|| {
                    s.canister_absolute_usage
                        .get(&(usage.canister_id, prev_month.clone()))
                        .unwrap_or_default()
                });

            // Calculate the delta that occurred since the last update
            let canister_usage_delta =
                calculate_usage_delta(&current_canister_usage, &prev_absolute_usage);

            // Fetch current accumulated usage for the project/month
            let mut project_usage = s
                .project_usage
                .get(&(project_id, current_month.clone()))
                .unwrap_or_default();

            // Add the delta to the project total
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
                (project_id, current_month.clone()),
                project_usage,
            );

            // Fetch current accumulated usage for this specific canister in this project/month
            let mut canister_usage_for_project = s
                .canister_usage
                .get(&(project_id, current_month.clone(), usage.canister_id))
                .unwrap_or_default();

            canister_usage_for_project.memory = canister_usage_for_project.memory.saturating_add(canister_usage_delta.memory);
            canister_usage_for_project.memory_bytes = canister_usage_for_project.memory_bytes.saturating_add(canister_usage_delta.memory_bytes);
            canister_usage_for_project.compute_allocation = canister_usage_for_project.compute_allocation.saturating_add(canister_usage_delta.compute_allocation);
            canister_usage_for_project.compute_allocation_percent = canister_usage_for_project.compute_allocation_percent.saturating_add(canister_usage_delta.compute_allocation_percent);
            canister_usage_for_project.ingress_induction = canister_usage_for_project.ingress_induction.saturating_add(canister_usage_delta.ingress_induction);
            canister_usage_for_project.ingress_induction_bytes_total = canister_usage_for_project.ingress_induction_bytes_total.saturating_add(canister_usage_delta.ingress_induction_bytes_total);
            canister_usage_for_project.instructions = canister_usage_for_project.instructions.saturating_add(canister_usage_delta.instructions);
            canister_usage_for_project.compute_time_seconds_total = canister_usage_for_project.compute_time_seconds_total.saturating_add(canister_usage_delta.compute_time_seconds_total);
            canister_usage_for_project.request_and_response_transmission = canister_usage_for_project.request_and_response_transmission.saturating_add(canister_usage_delta.request_and_response_transmission);
            canister_usage_for_project.transmission_bytes_total = canister_usage_for_project.transmission_bytes_total.saturating_add(canister_usage_delta.transmission_bytes_total);
            canister_usage_for_project.uninstall = canister_usage_for_project.uninstall.saturating_add(canister_usage_delta.uninstall);
            canister_usage_for_project.uninstalls_total = canister_usage_for_project.uninstalls_total.saturating_add(canister_usage_delta.uninstalls_total);
            canister_usage_for_project.http_outcalls = canister_usage_for_project.http_outcalls.saturating_add(canister_usage_delta.http_outcalls);
            canister_usage_for_project.burned_cycles = canister_usage_for_project.burned_cycles.saturating_add(canister_usage_delta.burned_cycles);

            s.canister_usage.insert(
                (project_id, current_month.clone(), usage.canister_id),
                canister_usage_for_project,
            );

            s.canister_month_project_index.insert(
                (usage.canister_id, current_month.clone()),
                project_id,
            );

            // Store the new absolute total
            s.canister_absolute_usage.insert(
                (usage.canister_id, current_month.clone()),
                current_canister_usage,
            );
        }
    });
}

pub fn list_canister_usages_for_project(
    project_id: ProjectId,
    billing_month: &BillingMonth,
) -> Vec<(Principal, Usage)> {
    STATE.with(|s| {
        let s = s.borrow();
        let start = (project_id, billing_month.clone(), MIN_PRINCIPAL);
        let end = (project_id, billing_month.clone(), MAX_PRINCIPAL);

        s.canister_usage
            .range(start..=end)
            .map(|entry| entry.into_pair())
            .map(|((_project_id, _billing_month, canister_id), usage)| (canister_id, usage))
            .collect()
    })
}

pub fn get_project_usage(project_id: ProjectId, billing_month: &BillingMonth) -> Usage {
    STATE.with(|s| {
        s.borrow()
            .project_usage
            .get(&(project_id, billing_month.clone()))
            .unwrap_or_default()
    })
}

fn calculate_usage_delta(current: &Usage, prev: &Usage) -> Usage {
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
