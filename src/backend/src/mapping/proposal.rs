use crate::{
    data,
    dto::{CreateProposalRequest, CreateProposalResponse, ProposalOperation, ProposalStatus},
};

pub fn map_create_proposal_request(
    req: CreateProposalRequest,
) -> Result<(data::Uuid, data::Proposal), String> {
    let project_uuid = data::Uuid::try_from(req.project_id.as_str())?;

    Ok((
        project_uuid,
        data::Proposal {
            project_id: project_uuid,
            status: data::ProposalStatus::Open,
            operation: match req.operation {
                ProposalOperation::CreateCanister => data::ProposalOperation::CreateCanister,
                ProposalOperation::AddCanisterController {
                    canister_id,
                    controller_id,
                } => data::ProposalOperation::AddCanisterController {
                    canister_id,
                    controller_id,
                },
            },
        },
    ))
}

pub fn map_create_proposal_response(
    proposal_id: data::Uuid,
    proposal: data::Proposal,
) -> CreateProposalResponse {
    CreateProposalResponse {
        id: proposal_id.to_string(),
        project_id: proposal.project_id.to_string(),
        status: match proposal.status {
            data::ProposalStatus::Open => ProposalStatus::Open,
            data::ProposalStatus::Rejected => ProposalStatus::Rejected,
            data::ProposalStatus::Executing => ProposalStatus::Executing,
            data::ProposalStatus::Executed => ProposalStatus::Executed,
            data::ProposalStatus::Failed(err) => ProposalStatus::Failed(err),
        },
        operation: match proposal.operation {
            data::ProposalOperation::CreateCanister => ProposalOperation::CreateCanister,
            data::ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            } => ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            },
        },
    }
}
