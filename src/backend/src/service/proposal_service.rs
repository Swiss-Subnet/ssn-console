use crate::{
    data::{
        approval_policy_repository, proposal_repository, OperationType, PolicyType,
        ProjectPermissions, Proposal, ProposalOperation,
    },
    dto::{CreateProposalRequest, CreateProposalResponse},
    mapping::{map_create_proposal_request, map_create_proposal_response},
    service::{access_control_service::ProjectAuth, canister_service},
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

pub async fn create_proposal(
    caller: &Principal,
    req: CreateProposalRequest,
) -> ApiResult<CreateProposalResponse> {
    let (project_id, proposal) = map_create_proposal_request(req)?;

    ProjectAuth::require(caller, project_id, ProjectPermissions::PROPOSAL_CREATE)?;

    let proposal_id = proposal_repository::create_proposal(project_id, proposal.clone());

    process_proposal(caller, project_id, proposal_id, proposal.clone()).await?;

    let proposal = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after processing"
        ))
    })?;

    Ok(map_create_proposal_response(proposal_id, proposal))
}

async fn process_proposal(
    caller: &Principal,
    project_id: Uuid,
    proposal_id: Uuid,
    proposal: Proposal,
) -> ApiResult {
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
        ProposalOperation::LinkCanister { canister_id, name } => {
            let approval_policy =
                approval_policy_repository::get_project_approval_policy_by_operation_type(
                    project_id,
                    OperationType::LinkCanister,
                )
                .unwrap_or_default();

            match approval_policy.policy_type {
                PolicyType::AutoApprove => {
                    proposal_repository::set_proposal_executing(proposal_id)?;
                    match canister_service::link_my_canister(*caller, project_id, canister_id, name)
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
