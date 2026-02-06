use crate::{
    dto::{
        CreateTermsAndConditionsRequest, CreateTermsAndConditionsResponseRequest,
        GetLatestTermsAndConditionsResponse,
    },
    service::{access_control_service, terms_and_conditions_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn get_latest_terms_and_conditions() -> GetLatestTermsAndConditionsResponse
{
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match terms_and_conditions_service::get_latest_terms_and_conditions(calling_principal)
    {
        Ok(response) => response,
        Err(err) => trap(err),
    }
}

#[update]
fn upsert_terms_and_conditions_response(req: CreateTermsAndConditionsResponseRequest) {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    if let Err(err) =
        terms_and_conditions_service::upsert_terms_and_conditions_response(calling_principal, req)
    {
        trap(&err);
    }
}

#[update]
fn create_terms_and_conditions(req: CreateTermsAndConditionsRequest) {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_controller(&calling_principal) {
        trap(&err);
    }

    if let Err(err) =
        terms_and_conditions_service::create_terms_and_conditions(calling_principal, req)
    {
        trap(&err);
    }
}
