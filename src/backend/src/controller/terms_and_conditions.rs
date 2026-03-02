use crate::{
    dto::{
        CreateTermsAndConditionsRequest, GetLatestTermsAndConditionsResponse,
        UpsertTermsAndConditionsDecisionRequest,
    },
    service::terms_and_conditions_service,
};
use canister_utils::{assert_authenticated, assert_controller, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn get_latest_terms_and_conditions() -> ApiResultDto<GetLatestTermsAndConditionsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    terms_and_conditions_service::get_latest_terms_and_conditions(caller).into()
}

#[update]
fn upsert_terms_and_conditions_decision(
    req: UpsertTermsAndConditionsDecisionRequest,
) -> ApiResultDto {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    terms_and_conditions_service::upsert_terms_and_conditions_decision(caller, req).into()
}

#[update]
fn create_terms_and_conditions(req: CreateTermsAndConditionsRequest) -> ApiResultDto {
    let caller = msg_caller();
    if let Err(err) = assert_controller(&caller) {
        return ApiResultDto::Err(err);
    }

    terms_and_conditions_service::create_terms_and_conditions(caller, req).into()
}
