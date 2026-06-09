use crate::{
    data::StaffPermissions,
    dto::{
        GetOrgBillingPlanRequest, GetOrgBillingPlanResponse, ListMyOrgBillingPlansResponse,
        SetOrgBillingPlanRequest, SetOrgBillingPlanResponse,
    },
    service::{access_control_service, organization_billing_plan_service},
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

// Staff-gated on WRITE_BILLING (canister controllers are auto-allowed via
// assert_staff_perm). The off-chain billing gateway and staff operators
// driving manual plan changes from the admin view both hit this path.
#[update]
fn admin_set_org_billing_plan(
    req: SetOrgBillingPlanRequest,
) -> ApiResultDto<SetOrgBillingPlanResponse> {
    let caller = msg_caller();
    if let Err(err) =
        access_control_service::assert_staff_perm(&caller, StaffPermissions::WRITE_BILLING)
    {
        return ApiResultDto::Err(err);
    }

    organization_billing_plan_service::set_org_plan(req)
        .map(|()| SetOrgBillingPlanResponse {})
        .into()
}

#[query]
fn get_org_billing_plan(req: GetOrgBillingPlanRequest) -> ApiResultDto<GetOrgBillingPlanResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_billing_plan_service::get_org_billing_plan(&caller, req).into()
}

#[query]
fn list_my_org_billing_plans() -> ApiResultDto<ListMyOrgBillingPlansResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_billing_plan_service::list_my_org_billing_plans(&caller).into()
}
