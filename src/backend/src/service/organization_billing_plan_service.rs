use crate::{
    data::{
        organization_billing_plan_repository, organization_repository, user_profile_repository,
        OrgId, OrgPermissions, OrganizationBillingPlan, PlanTier as ModelPlanTier,
    },
    dto::{
        self, GetOrgBillingPlanRequest, GetOrgBillingPlanResponse, ListMyOrgBillingPlansResponse,
        MyOrgBillingPlan, SetOrgBillingPlanRequest,
    },
    service::{access_control_service::OrgAuth, canister_service},
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult};

pub fn set_org_plan(req: SetOrgBillingPlanRequest) -> ApiResult {
    let org_id = OrgId::try_from(req.org_id.as_str())?;

    if organization_repository::get_org(org_id).is_none() {
        return Err(ApiError::client_error(format!(
            "Organization with id {org_id} does not exist."
        )));
    }

    let plan = match req.tier {
        dto::PlanTier::Free => OrganizationBillingPlan::free_snapshot(),
        dto::PlanTier::Pro => OrganizationBillingPlan::pro_snapshot(),
        // Enterprise carries custom per-org limits, so the simple
        // (org_id, tier) setter refuses it; a richer endpoint owns that.
        dto::PlanTier::Enterprise => {
            return Err(ApiError::client_error(
                "Enterprise plans must be assigned via the custom-limits endpoint.".to_string(),
            ));
        }
    };

    organization_billing_plan_repository::set_plan(org_id, plan);
    Ok(())
}

pub fn get_org_billing_plan(
    caller: &Principal,
    req: GetOrgBillingPlanRequest,
) -> ApiResult<GetOrgBillingPlanResponse> {
    let org_id = OrgId::try_from(req.org_id.as_str())?;
    let _auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    let plan = organization_billing_plan_repository::get_or_default(org_id);
    let canisters_used = canister_service::count_active_canisters_for_org(org_id) as u32;

    Ok(GetOrgBillingPlanResponse {
        tier: model_tier_to_dto(plan.tier),
        max_canisters: plan.limits.max_canisters,
        canisters_used,
        max_storage_bytes: plan.limits.max_storage_bytes,
    })
}

fn model_tier_to_dto(tier: ModelPlanTier) -> dto::PlanTier {
    match tier {
        ModelPlanTier::Free => dto::PlanTier::Free,
        ModelPlanTier::Pro => dto::PlanTier::Pro,
        ModelPlanTier::Enterprise => dto::PlanTier::Enterprise,
    }
}

pub fn list_my_org_billing_plans(caller: &Principal) -> ApiResult<ListMyOrgBillingPlansResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;

    let plans = organization_repository::list_user_orgs(user_id)
        .into_iter()
        .map(|(org_id, _org)| {
            let plan = organization_billing_plan_repository::get_or_default(org_id);
            let canisters_used = canister_service::count_active_canisters_for_org(org_id) as u32;
            MyOrgBillingPlan {
                org_id: org_id.to_string(),
                tier: model_tier_to_dto(plan.tier),
                max_canisters: plan.limits.max_canisters,
                canisters_used,
                max_storage_bytes: plan.limits.max_storage_bytes,
            }
        })
        .collect();
    Ok(plans)
}
