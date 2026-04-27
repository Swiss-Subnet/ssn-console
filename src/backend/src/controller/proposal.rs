use crate::{
    dto::{
        CancelProposalRequest, CancelProposalResponse, CreateProposalRequest,
        CreateProposalResponse, GetProposalRequest, GetProposalResponse,
        ListProjectProposalsRequest, ListProjectProposalsResponse, VoteProposalRequest,
        VoteProposalResponse,
    },
    service::{access_control_service, proposal_service},
};
use canister_utils::ApiResultDto;
use ic_cdk::{api::msg_caller, *};

#[update]
async fn create_proposal(request: CreateProposalRequest) -> ApiResultDto<CreateProposalResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    proposal_service::create_proposal(&caller, request)
        .await
        .into()
}

#[query]
fn get_proposal(request: GetProposalRequest) -> ApiResultDto<GetProposalResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    proposal_service::get_proposal(&caller, request).into()
}

#[query]
fn list_project_proposals(
    request: ListProjectProposalsRequest,
) -> ApiResultDto<ListProjectProposalsResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    proposal_service::list_project_proposals(&caller, request).into()
}

#[update]
async fn vote_proposal(request: VoteProposalRequest) -> ApiResultDto<VoteProposalResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    proposal_service::vote_proposal(&caller, request)
        .await
        .into()
}

#[update]
fn cancel_proposal(request: CancelProposalRequest) -> ApiResultDto<CancelProposalResponse> {
    let caller = msg_caller();
    if let Err(err) = access_control_service::assert_has_platform_access(&caller) {
        return ApiResultDto::Err(err);
    }

    proposal_service::cancel_proposal(&caller, request).into()
}
