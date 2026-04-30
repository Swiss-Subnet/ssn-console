use crate::{
    data::{approval_policy_repository, ApprovalPolicy, ProjectPermissions},
    dto::{
        ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse,
        UpsertApprovalPolicyRequest, UpsertApprovalPolicyResponse,
    },
    mapping::{
        map_approval_policy_response, map_list_project_approval_policies_response,
        map_upsert_approval_policy_request,
    },
    service::access_control_service::ProjectAuth,
};
use candid::Principal;
use canister_utils::{ApiResult, Uuid};

pub fn list_project_approval_policies(
    caller: &Principal,
    request: ListProjectApprovalPoliciesRequest,
) -> ApiResult<ListProjectApprovalPoliciesResponse> {
    let project_id = Uuid::try_from(request.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;

    let policies = approval_policy_repository::list_project_approval_policies(auth.project_id());

    Ok(map_list_project_approval_policies_response(policies))
}

pub fn upsert_approval_policy(
    caller: &Principal,
    request: UpsertApprovalPolicyRequest,
) -> ApiResult<UpsertApprovalPolicyResponse> {
    let (project_id, operation_type, policy) = map_upsert_approval_policy_request(request)?;

    let auth = ProjectAuth::require(
        caller,
        project_id,
        ProjectPermissions::APPROVAL_POLICY_MANAGE,
    )?;

    let policy_id = approval_policy_repository::upsert_approval_policy(
        auth.project_id(),
        operation_type,
        ApprovalPolicy {
            policy_type: policy.policy_type.clone(),
        },
    );

    Ok(map_approval_policy_response((
        policy_id,
        operation_type,
        policy,
    )))
}
