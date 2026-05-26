use crate::data::{
    memory::{get_memory, Memory, ORGANIZATION_BILLING_PLAN_MEMORY_ID},
    OrgId, OrganizationBillingPlan,
};
use ic_stable_structures::BTreeMap;

pub type BillingPlanMemory = BTreeMap<OrgId, OrganizationBillingPlan, Memory>;

pub fn init_billing_plans() -> BillingPlanMemory {
    BillingPlanMemory::init(get_billing_plan_memory())
}

fn get_billing_plan_memory() -> Memory {
    get_memory(ORGANIZATION_BILLING_PLAN_MEMORY_ID)
}
