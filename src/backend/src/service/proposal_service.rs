use crate::{
    data::{
        approval_policy_repository, proposal_repository, proposal_repository::VoteOutcome,
        OperationType, PolicyType, ProjectPermissions, Proposal, ProposalOperation, Vote,
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

    process_proposal(project_id, proposal_id, proposal.clone()).await?;

    let proposal = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after processing"
        ))
    })?;

    Ok(map_create_proposal_response(proposal_id, proposal))
}

async fn process_proposal(project_id: Uuid, proposal_id: Uuid, proposal: Proposal) -> ApiResult {
    let approval_policy =
        approval_policy_repository::get_project_approval_policy_by_operation_type(
            project_id,
            operation_type_of(&proposal.operation),
        )
        .unwrap_or_default();

    match approval_policy.policy_type {
        PolicyType::AutoApprove => {
            execute_operation(project_id, proposal_id, proposal.operation).await
        }
    }
}

fn operation_type_of(operation: &ProposalOperation) -> OperationType {
    match operation {
        ProposalOperation::CreateCanister => OperationType::CreateCanister,
        ProposalOperation::AddCanisterController { .. } => OperationType::AddCanisterController,
    }
}

async fn execute_operation(
    project_id: Uuid,
    proposal_id: Uuid,
    operation: ProposalOperation,
) -> ApiResult {
    proposal_repository::set_proposal_executing(proposal_id)?;

    let result = match operation {
        ProposalOperation::CreateCanister => canister_service::create_my_canister(project_id).await,
        ProposalOperation::AddCanisterController {
            canister_id,
            controller_id,
        } => canister_service::add_canister_controller(canister_id, controller_id).await,
    };

    match result {
        Ok(()) => proposal_repository::set_proposal_executed(proposal_id),
        Err(err) => proposal_repository::set_proposal_failed(proposal_id, err),
    }
}

#[allow(dead_code)]
pub async fn vote_proposal(
    caller: &Principal,
    proposal_id: Uuid,
    vote: Vote,
) -> ApiResult<Proposal> {
    let proposal = proposal_repository::get_proposal(&proposal_id)
        .ok_or_else(|| ApiError::client_error(format!("Proposal {proposal_id} does not exist.")))?;

    ProjectAuth::require(
        caller,
        proposal.project_id,
        ProjectPermissions::PROPOSAL_APPROVE,
    )?;

    let outcome = proposal_repository::record_proposal_vote(proposal_id, *caller, vote)?;

    if let VoteOutcome::ReachedApproval = outcome {
        execute_operation(proposal.project_id, proposal_id, proposal.operation.clone()).await?;
    }

    proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after voting"
        ))
    })
}
