use crate::{
    data::{
        approval_policy_repository, proposal_repository, OperationType, PolicyType, Proposal,
        ProposalOperation, Uuid,
    },
    dto::{CreateProposalRequest, CreateProposalResponse},
    mapping::{map_create_proposal_request, map_create_proposal_response},
    service::canister_service,
};

pub async fn create_proposal(req: CreateProposalRequest) -> Result<CreateProposalResponse, String> {
    let (project_id, proposal) = map_create_proposal_request(req)?;

    let proposal_id = proposal_repository::create_proposal(project_id, proposal.clone());

    process_proposal(project_id, proposal_id, proposal.clone()).await?;

    Ok(map_create_proposal_response(proposal_id, proposal))
}

async fn process_proposal(
    project_id: Uuid,
    proposal_id: Uuid,
    proposal: Proposal,
) -> Result<(), String> {
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
