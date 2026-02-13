use crate::{
    data::{
        approval_policy_repository, project_repository, team_repository, user_profile_repository,
        Uuid,
    },
    dto::{ListProjectApprovalPoliciesRequest, ListProjectApprovalPoliciesResponse},
    mapping::map_list_project_approval_policies_response,
};
use candid::Principal;

pub fn list_project_approval_policies(
    calling_principal: &Principal,
    request: ListProjectApprovalPoliciesRequest,
) -> Result<ListProjectApprovalPoliciesResponse, String> {
    let project_id = Uuid::try_from(request.project_id.as_str())?;

    let user_id = user_profile_repository::assert_user_id_by_principal(calling_principal)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    if !project_repository::any_teams_have_project(&team_ids, project_id) {
        return Err(format!(
            "User with id {user_id} does not have access to project with id {project_id}"
        ));
    }

    let policies = approval_policy_repository::list_project_approval_policies(project_id);

    Ok(map_list_project_approval_policies_response(policies))
}
