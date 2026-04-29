use super::{
    memory::{init_billing_plans, BillingPlanMemory},
    OrganizationBillingPlan,
};
use canister_utils::Uuid;
use std::cell::RefCell;

pub fn set_plan(org_id: Uuid, plan: OrganizationBillingPlan) {
    mutate_state(|s| {
        s.billing_plans.insert(org_id, plan);
    });
}

pub fn get_plan(org_id: Uuid) -> Option<OrganizationBillingPlan> {
    with_state(|s| s.billing_plans.get(&org_id))
}

// Returns the persisted plan if one exists, otherwise the canonical Free
// default *without* writing it. This is the lazy-init pattern: orgs with
// no record are treated as Free at read time, so existing orgs do not
// need a backfill on rollout.
pub fn get_or_default(org_id: Uuid) -> OrganizationBillingPlan {
    get_plan(org_id).unwrap_or_default()
}

pub fn delete_plan(org_id: Uuid) {
    mutate_state(|s| {
        s.billing_plans.remove(&org_id);
    });
}

struct BillingPlanState {
    billing_plans: BillingPlanMemory,
}

impl Default for BillingPlanState {
    fn default() -> Self {
        Self {
            billing_plans: init_billing_plans(),
        }
    }
}

thread_local! {
    static STATE: RefCell<BillingPlanState> = RefCell::new(BillingPlanState::default());
}

fn with_state<R>(f: impl FnOnce(&BillingPlanState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut BillingPlanState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
