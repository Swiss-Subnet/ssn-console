use crate::{
    dto::{CreateTrustedPartnerRequest, CreateTrustedPartnerResponse, ListTrustedPartnersResponse},
    service::{access_control_service, trusted_partner_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_trusted_partners() -> ListTrustedPartnersResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    trusted_partner_service::list_trusted_partners()
}

#[update]
fn create_trusted_partner(req: CreateTrustedPartnerRequest) -> CreateTrustedPartnerResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    match trusted_partner_service::create_trusted_partner(req) {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
