use crate::{
    dto::{ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse},
    service::{access_control_service, approval_policy_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_project_approval_policies(
    request: ListProjectApprovalPoliciesRequest,
) -> ListProjectApprovalPoliciesResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match approval_policy_service::list_project_approval_policies(&calling_principal, request) {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
