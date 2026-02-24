use crate::data::{
    approval_policy_repository, canister_repository, project_repository, team_repository,
    ApprovalPolicy, OperationType, PolicyType,
};
use crate::dto::ListMyOrganizationsResponse;
use crate::{
    data::{organization_repository, user_profile_repository},
    mapping::map_list_my_organizations_response,
};
use candid::Principal;

pub fn init() {
    let user_ids = user_profile_repository::list_user_ids();

    for user_id in user_ids {
        let org_id = organization_repository::list_user_org_ids(user_id)
            .first()
            .cloned()
            .unwrap_or_else(|| organization_repository::add_default_org(user_id));

        let team_id = team_repository::list_user_team_ids(user_id)
            .first()
            .cloned()
            .unwrap_or_else(|| team_repository::add_default_team(user_id, org_id));

        let project_id = project_repository::list_team_project_ids(team_id)
            .first()
            .cloned()
            .unwrap_or_else(|| project_repository::add_default_project(team_id, org_id));

        approval_policy_repository::upsert_approval_policy(
            project_id,
            OperationType::CreateCanister,
            ApprovalPolicy {
                policy_type: PolicyType::AutoApprove,
            },
        );
        approval_policy_repository::upsert_approval_policy(
            project_id,
            OperationType::AddCanisterController,
            ApprovalPolicy {
                policy_type: PolicyType::AutoApprove,
            },
        );

        let canister_ids = canister_repository::list_canister_ids_by_project(user_id);
        for canister_id in canister_ids {
            canister_repository::move_canister_from_user_to_project(
                user_id,
                project_id,
                canister_id,
            );
        }
    }
}

pub fn list_my_organizations(
    calling_principal: Principal,
) -> Result<ListMyOrganizationsResponse, String> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&calling_principal)?;

    let organizations = organization_repository::list_user_orgs(user_id);
    Ok(map_list_my_organizations_response(organizations))
}
