use crate::{
    data,
    dto::{CreateProposalRequest, CreateProposalResponse, ProposalOperation, ProposalStatus},
    validation::CanisterName,
};
use canister_utils::{ApiError, ApiResult, Uuid};

pub fn map_create_proposal_request(
    req: CreateProposalRequest,
) -> ApiResult<(Uuid, data::Proposal)> {
    let project_uuid = Uuid::try_from(req.project_id.as_str())?;

    Ok((
        project_uuid,
        data::Proposal {
            project_id: project_uuid,
            status: data::ProposalStatus::Open,
            operation: match req.operation {
                Some(ProposalOperation::CreateCanister {}) => {
                    data::ProposalOperation::CreateCanister
                }
                Some(ProposalOperation::LinkCanister { canister_id, name }) => {
                    let validated_name = match name {
                        None => None,
                        Some(raw) => Some(CanisterName::try_from(raw)?.into_inner()),
                    };
                    data::ProposalOperation::LinkCanister {
                        canister_id,
                        name: validated_name,
                    }
                }
                Some(ProposalOperation::AddCanisterController {
                    canister_id,
                    controller_id,
                }) => data::ProposalOperation::AddCanisterController {
                    canister_id,
                    controller_id,
                },
                None => {
                    return Err(ApiError::client_error(
                        "Failed to decode proposal request operation".to_string(),
                    ))
                }
            },
        },
    ))
}

pub fn map_create_proposal_response(
    proposal_id: Uuid,
    proposal: data::Proposal,
) -> CreateProposalResponse {
    CreateProposalResponse {
        id: proposal_id.to_string(),
        project_id: proposal.project_id.to_string(),
        status: match proposal.status {
            data::ProposalStatus::Open => Some(ProposalStatus::Open {}),
            data::ProposalStatus::Rejected => Some(ProposalStatus::Rejected {}),
            data::ProposalStatus::Executing => Some(ProposalStatus::Executing {}),
            data::ProposalStatus::Executed => Some(ProposalStatus::Executed {}),
            data::ProposalStatus::Failed(err) => Some(ProposalStatus::Failed { message: err }),
        },
        operation: match proposal.operation {
            data::ProposalOperation::CreateCanister => Some(ProposalOperation::CreateCanister {}),
            data::ProposalOperation::LinkCanister { canister_id, name } => {
                Some(ProposalOperation::LinkCanister { canister_id, name })
            }
            data::ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            } => Some(ProposalOperation::AddCanisterController {
                canister_id,
                controller_id,
            }),
        },
    }
}
