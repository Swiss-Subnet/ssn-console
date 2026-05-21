use crate::{
    dto::{
        GetOrgBillingPlanRequest, GetOrgBillingPlanResponse, ListMyOrgBillingPlansResponse,
        SetOrgBillingPlanRequest, SetOrgBillingPlanResponse,
    },
    service::organization_billing_plan_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
fn set_org_billing_plan(req: SetOrgBillingPlanRequest) -> ApiResultDto<SetOrgBillingPlanResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
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
