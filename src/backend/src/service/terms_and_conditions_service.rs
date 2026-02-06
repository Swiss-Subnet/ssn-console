use crate::{
    data::{terms_and_conditions_repository, user_profile_repository},
    dto::{
        CreateTermsAndConditionsRequest, CreateTermsAndConditionsResponseRequest,
        GetLatestTermsAndConditionsResponse,
    },
    mapping::{
        map_create_terms_and_conditions_request, map_create_terms_and_conditions_response_request,
        map_get_latest_terms_and_conditions_response,
    },
};
use candid::Principal;
use ic_cdk::api::{is_controller, time};

pub fn get_latest_terms_and_conditions(
    calling_principal: Principal,
) -> Result<GetLatestTermsAndConditionsResponse, String> {
    let user_id = user_profile_repository::get_user_id_by_principal(&calling_principal)
        .ok_or_else(|| {
            format!(
                "User profile for principal {} does not exist",
                calling_principal
            )
        })?;

    let terms_and_conditions =
        terms_and_conditions_repository::get_latest_terms_and_conditions(user_id);
    Ok(map_get_latest_terms_and_conditions_response(
        terms_and_conditions,
    ))
}

pub fn upsert_terms_and_conditions_response(
    calling_principal: Principal,
    req: CreateTermsAndConditionsResponseRequest,
) -> Result<(), String> {
    if is_controller(&calling_principal) {
        return Err("Controllers do not need to accept terms and conditions".to_string());
    }

    let user_id = user_profile_repository::get_user_id_by_principal(&calling_principal)
        .ok_or_else(|| {
            format!(
                "User profile for principal {} does not exist",
                calling_principal
            )
        })?;

    let current_time = time();
    let req = map_create_terms_and_conditions_response_request(req, user_id, current_time)?;

    let _id = terms_and_conditions_repository::upsert_terms_and_conditions_response(req)?;

    Ok(())
}

pub fn create_terms_and_conditions(
    calling_principal: Principal,
    req: CreateTermsAndConditionsRequest,
) -> Result<(), String> {
    let user_id = user_profile_repository::get_user_id_by_principal(&calling_principal)
        .ok_or_else(|| {
            format!(
                "User profile for principal {} does not exist",
                calling_principal
            )
        })?;

    let current_time = time();
    let req = map_create_terms_and_conditions_request(req, user_id, current_time)?;

    terms_and_conditions_repository::create_terms_and_conditions(req);

    Ok(())
}
