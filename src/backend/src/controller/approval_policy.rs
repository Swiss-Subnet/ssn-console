use crate::{
    dto::{
        ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse,
        UpsertApprovalPolicyRequest, UpsertApprovalPolicyResponse,
    },
    service::{access_control_service, approval_policy_service},
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_project_approval_policies(
    request: ListProjectApprovalPoliciesRequest,
) -> ApiResultDto<ListProjectApprovalPoliciesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    approval_policy_service::list_project_approval_policies(&caller, request).into()
}

#[update]
fn upsert_approval_policy(
    request: UpsertApprovalPolicyRequest,
) -> ApiResultDto<UpsertApprovalPolicyResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    approval_policy_service::upsert_approval_policy(&caller, request).into()
}
