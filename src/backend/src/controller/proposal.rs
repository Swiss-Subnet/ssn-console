use crate::{
    dto::{CreateProposalRequest, CreateProposalResponse},
    service::{access_control_service, proposal_service},
};
use ic_cdk::{api::msg_caller, *};

#[update]
async fn create_proposal(request: CreateProposalRequest) -> CreateProposalResponse {
    let calling_principal = msg_caller();
    if let Err(err) =
        access_control_service::assert_accepted_latest_terms_and_conditions(&calling_principal)
    {
        trap(&err);
    }

    match proposal_service::create_proposal(&calling_principal, request).await {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
