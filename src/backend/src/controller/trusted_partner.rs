use crate::{
    dto::{CreateTrustedPartnerRequest, CreateTrustedPartnerResponse, ListTrustedPartnersResponse},
    service::trusted_partner_service,
};
use canister_utils::{assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_trusted_partners() -> ApiResultDto<ListTrustedPartnersResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(trusted_partner_service::list_trusted_partners())
}

#[update]
fn create_trusted_partner(
    req: CreateTrustedPartnerRequest,
) -> ApiResultDto<CreateTrustedPartnerResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    trusted_partner_service::create_trusted_partner(req).into()
}
