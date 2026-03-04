use crate::{
    data::{
        approval_policy_repository, project_repository, team_repository, user_profile_repository,
    },
    dto::{ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse},
    mapping::map_list_project_approval_policies_response,
};
use candid::Principal;
use canister_utils::{ApiResult, Uuid};

pub fn list_project_approval_policies(
    caller: &Principal,
    request: ListProjectApprovalPoliciesRequest,
) -> ApiResult<ListProjectApprovalPoliciesResponse> {
    let project_id = Uuid::try_from(request.project_id.as_str())?;

    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    project_repository::assert_any_team_has_project(&user_id, &team_ids, project_id)?;

    let policies = approval_policy_repository::list_project_approval_policies(project_id);

    Ok(map_list_project_approval_policies_response(policies))
}
