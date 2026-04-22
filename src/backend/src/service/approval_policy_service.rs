use crate::{
    data::{approval_policy_repository, ProjectPermissions},
    dto::{ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse},
    mapping::map_list_project_approval_policies_response,
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
