use crate::{
    data::{
        approval_policy_repository, project_repository, proposal_repository, team_repository,
        user_profile_repository, OperationType, PolicyType, Proposal, ProposalOperation,
    },
    dto::{CreateProposalRequest, CreateProposalResponse},
    mapping::{map_create_proposal_request, map_create_proposal_response},
    service::canister_service,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

pub async fn create_proposal(
    caller: &Principal,
    req: CreateProposalRequest,
) -> ApiResult<CreateProposalResponse> {
    let (project_id, proposal) = map_create_proposal_request(req)?;

    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    if !project_repository::any_teams_have_project(&team_ids, project_id) {
        return Err(ApiError::unauthorized(format!(
            "User with id {user_id} does not have access to project with id {project_id}"
        )));
    }

    let proposal_id = proposal_repository::create_proposal(project_id, proposal.clone());

    process_proposal(project_id, proposal_id, proposal.clone()).await?;

    let proposal = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after processing"
        ))
    })?;

    Ok(map_create_proposal_response(proposal_id, proposal))
}

async fn process_proposal(project_id: Uuid, proposal_id: Uuid, proposal: Proposal) -> ApiResult {
    match proposal.operation {
        ProposalOperation::CreateCanister => {
            let approval_policy =
                approval_policy_repository::get_project_approval_policy_by_operation_type(
                    project_id,
                    OperationType::CreateCanister,
                )
                .unwrap_or_default();

            match approval_policy.policy_type {
                PolicyType::AutoApprove => {
                    proposal_repository::set_proposal_executing(proposal_id)?;
                    match canister_service::create_my_canister(project_id).await {
                        Ok(_) => {
                            proposal_repository::set_proposal_executed(proposal_id)?;
                        }
                        Err(err) => {
                            proposal_repository::set_proposal_failed(proposal_id, err)?;
                        }
                    }
                }
            }
        }
        ProposalOperation::AddCanisterController {
            canister_id,
            controller_id,
        } => {
            let approval_policy =
                approval_policy_repository::get_project_approval_policy_by_operation_type(
                    project_id,
                    OperationType::AddCanisterController,
                )
                .unwrap_or_default();

            match approval_policy.policy_type {
                PolicyType::AutoApprove => {
                    proposal_repository::set_proposal_executing(proposal_id)?;
                    match canister_service::add_canister_controller(canister_id, controller_id)
                        .await
                    {
                        Ok(()) => {
                            proposal_repository::set_proposal_executed(proposal_id)?;
                        }
                        Err(err) => {
                            proposal_repository::set_proposal_failed(proposal_id, err)?;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
