use crate::{
    constants::{DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT, MIN_PAGINATION_LIMIT},
    data::{
        approval_policy_repository, proposal_repository, proposal_repository::VoteOutcome,
        OperationType, PolicyType, ProjectPermissions, Proposal, ProposalOperation, ProposalStatus,
    },
    dto::{
        CancelProposalRequest, CancelProposalResponse, CreateProposalRequest,
        CreateProposalResponse, GetProposalRequest, GetProposalResponse,
        ListProjectProposalsRequest, ListProjectProposalsResponse, VoteProposalRequest,
        VoteProposalResponse,
    },
    mapping::{
        map_create_proposal_request, map_list_project_proposals_response, map_proposal_response,
        map_vote_proposal_request, proposal_matches_status_filter,
    },
    service::{
        access_control_service, access_control_service::proposal_not_found_or_no_access,
        access_control_service::ProjectAuth, canister_service,
    },
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

pub async fn create_proposal(
    caller: &Principal,
    req: CreateProposalRequest,
) -> ApiResult<CreateProposalResponse> {
    let (project_id, operation) = map_create_proposal_request(req)?;

    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROPOSAL_CREATE)?;

    let proposal = Proposal {
        project_id,
        proposer_id: auth.user_id(),
        status: ProposalStatus::Open,
        operation,
    };
    let proposal_id = proposal_repository::create_proposal(project_id, proposal.clone());

    process_proposal(project_id, proposal_id, proposal.clone()).await?;

    let proposal = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after processing"
        ))
    })?;

    Ok(map_proposal_response(proposal_id, proposal))
}

pub fn get_proposal(caller: &Principal, req: GetProposalRequest) -> ApiResult<GetProposalResponse> {
    let proposal_id = Uuid::try_from(req.proposal_id.as_str())?;

    let proposal = proposal_repository::get_proposal(&proposal_id)
        .ok_or_else(|| proposal_not_found_or_no_access(proposal_id))?;

    ProjectAuth::require(caller, proposal.project_id, ProjectPermissions::EMPTY)
        .map_err(|_| proposal_not_found_or_no_access(proposal_id))?;

    Ok(map_proposal_response(proposal_id, proposal))
}

pub fn list_project_proposals(
    caller: &Principal,
    req: ListProjectProposalsRequest,
) -> ApiResult<ListProjectProposalsResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;

    let after = req.after.as_deref().map(Uuid::try_from).transpose()?;
    let limit = req
        .limit
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT) as usize;

    let status_filter = req.status_filter.as_ref();
    let proposals =
        proposal_repository::list_project_proposals(auth.project_id(), after, limit, |proposal| {
            match status_filter {
                Some(filters) => filters
                    .iter()
                    .any(|f| proposal_matches_status_filter(proposal, f)),
                None => true,
            }
        });

    let next_cursor = (proposals.len() == limit)
        .then(|| proposals.last().map(|(id, _)| *id))
        .flatten();

    Ok(map_list_project_proposals_response(proposals, next_cursor))
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
        PolicyType::FixedQuorum { threshold } => {
            if threshold < 1 {
                return Err(ApiError::client_error(format!(
                    "FixedQuorum policy on project {project_id} has invalid threshold 0."
                )));
            }

            let approvers = access_control_service::list_project_principals_with_permission(
                project_id,
                ProjectPermissions::PROPOSAL_APPROVE,
            );

            if (approvers.len() as u32) < threshold {
                return Err(ApiError::client_error(format!(
                    "FixedQuorum policy requires {threshold} approvers but project {project_id} only has {}.",
                    approvers.len()
                )));
            }

            proposal_repository::set_proposal_pending_approval(proposal_id, threshold, approvers)
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

pub async fn vote_proposal(
    caller: &Principal,
    req: VoteProposalRequest,
) -> ApiResult<VoteProposalResponse> {
    let (proposal_id, vote) = map_vote_proposal_request(req)?;

    let proposal = proposal_repository::get_proposal(&proposal_id)
        .ok_or_else(|| proposal_not_found_or_no_access(proposal_id))?;

    let auth = ProjectAuth::require(caller, proposal.project_id, ProjectPermissions::EMPTY)
        .map_err(|_| proposal_not_found_or_no_access(proposal_id))?;
    if !auth.perms().contains(ProjectPermissions::PROPOSAL_APPROVE) {
        return Err(ApiError::unauthorized(format!(
            "User {} lacks proposal_approve on project {}.",
            auth.user_id(),
            auth.project_id()
        )));
    }

    let outcome = proposal_repository::record_proposal_vote(proposal_id, *caller, vote)?;

    if let VoteOutcome::ReachedApproval = outcome {
        execute_operation(proposal.project_id, proposal_id, proposal.operation.clone()).await?;
    }

    let updated = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after voting"
        ))
    })?;

    Ok(map_proposal_response(proposal_id, updated))
}

pub fn cancel_proposal(
    caller: &Principal,
    req: CancelProposalRequest,
) -> ApiResult<CancelProposalResponse> {
    let proposal_id = Uuid::try_from(req.proposal_id.as_str())?;

    let proposal = proposal_repository::get_proposal(&proposal_id)
        .ok_or_else(|| proposal_not_found_or_no_access(proposal_id))?;

    let auth = ProjectAuth::require(caller, proposal.project_id, ProjectPermissions::EMPTY)
        .map_err(|_| proposal_not_found_or_no_access(proposal_id))?;
    if auth.user_id() != proposal.proposer_id
        && !auth.perms().contains(ProjectPermissions::PROJECT_ADMIN)
    {
        return Err(ApiError::unauthorized(format!(
            "User {} cannot cancel proposal {proposal_id}: must be the proposer or a project admin.",
            auth.user_id()
        )));
    }

    proposal_repository::cancel_proposal(proposal_id)?;

    let updated = proposal_repository::get_proposal(&proposal_id).ok_or_else(|| {
        ApiError::internal_error(format!(
            "Could not find proposal {proposal_id} after cancelling"
        ))
    })?;

    Ok(map_proposal_response(proposal_id, updated))
}
