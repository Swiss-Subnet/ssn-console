use crate::{
    data::{
        approval_policy_repository, canister_repository, invite_repository, memory_metrics,
        organization_billing_plan_repository, organization_repository,
        orphaned_canister_repository, project_repository, proposal_repository,
        service_principal_repository, team_repository, terms_and_conditions_repository,
        trusted_partner_repository, user_profile_repository,
    },
    dto::{EntryCount, GetMetricsResponse, MemoryRegion},
};
use candid::Nat;
use ic_cdk::api::canister_cycle_balance;

pub fn collect_metrics() -> GetMetricsResponse {
    let entry_counts = collect_entry_counts();
    let memory_regions = collect_memory_regions();
    let total_stable_pages: u64 = memory_regions.iter().map(|m| m.pages).sum();
    let total_stable_bytes: u64 = memory_regions.iter().map(|m| m.bytes).sum();

    GetMetricsResponse {
        entry_counts,
        memory_regions,
        total_stable_pages,
        total_stable_bytes,
        cycles_balance: Nat::from(canister_cycle_balance()),
    }
}

fn collect_entry_counts() -> Vec<EntryCount> {
    let groups: [Vec<(&'static str, u64)>; 13] = [
        user_profile_repository::metrics_counts(),
        organization_repository::metrics_counts(),
        team_repository::metrics_counts(),
        project_repository::metrics_counts(),
        canister_repository::metrics_counts(),
        approval_policy_repository::metrics_counts(),
        proposal_repository::metrics_counts(),
        invite_repository::metrics_counts(),
        trusted_partner_repository::metrics_counts(),
        terms_and_conditions_repository::metrics_counts(),
        organization_billing_plan_repository::metrics_counts(),
        orphaned_canister_repository::metrics_counts(),
        service_principal_repository::metrics_counts(),
    ];
    groups
        .into_iter()
        .flatten()
        .map(|(name, count)| EntryCount {
            name: name.to_string(),
            count,
        })
        .collect()
}

fn collect_memory_regions() -> Vec<MemoryRegion> {
    memory_metrics()
        .into_iter()
        .map(|m| MemoryRegion {
            name: m.name.to_string(),
            memory_id: m.memory_id,
            pages: m.pages,
            bytes: m.bytes,
        })
        .collect()
}
