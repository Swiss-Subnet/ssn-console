use crate::{
    data::{terms_and_conditions_repository, user_profile_repository},
    dto::{
        CreateTermsAndConditionsRequest, GetLatestTermsAndConditionsResponse,
        ListTermsAndConditionsResponse, UpsertTermsAndConditionsDecisionRequest,
    },
    mapping::{
        map_create_terms_and_conditions_decision_request, map_create_terms_and_conditions_request,
        map_get_latest_terms_and_conditions_response, map_list_terms_and_conditions_response,
    },
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult};
use ic_cdk::api::{is_controller, time};

pub fn get_latest_terms_and_conditions(
    caller: Principal,
) -> ApiResult<GetLatestTermsAndConditionsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let terms_and_conditions =
        terms_and_conditions_repository::get_latest_terms_and_conditions(user_id);
    Ok(map_get_latest_terms_and_conditions_response(
        terms_and_conditions,
    ))
}

pub fn upsert_terms_and_conditions_decision(
    caller: Principal,
    req: UpsertTermsAndConditionsDecisionRequest,
) -> ApiResult {
    if is_controller(&caller) {
        return Err(ApiError::unauthorized(
            "Controllers do not need to accept terms and conditions.".to_string(),
        ));
    }

    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let current_time = time();
    let req = map_create_terms_and_conditions_decision_request(req, user_id, current_time)?;

    let _id = terms_and_conditions_repository::upsert_terms_and_conditions_decision(req)?;

    Ok(())
}

pub fn list_terms_and_conditions() -> ListTermsAndConditionsResponse {
    let items = terms_and_conditions_repository::list_terms_and_conditions();
    map_list_terms_and_conditions_response(items)
}

pub fn create_terms_and_conditions(
    caller: Principal,
    req: CreateTermsAndConditionsRequest,
) -> ApiResult {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let current_time = time();
    let req = map_create_terms_and_conditions_request(req, user_id, current_time)?;

    terms_and_conditions_repository::create_terms_and_conditions(req);

    Ok(())
}
