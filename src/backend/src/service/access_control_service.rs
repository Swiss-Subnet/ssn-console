use crate::data::{
    terms_and_conditions_repository, trusted_partner_repository, user_profile_repository,
};
use candid::Principal;
use canister_utils::{assert_authenticated, ApiError, ApiResult};
use ic_cdk::api::is_controller;

pub fn assert_trusted_partner(caller: &Principal) -> ApiResult {
    assert_authenticated(caller)?;

    if !trusted_partner_repository::is_trusted_partner(caller) {
        return Err(ApiError::unauthorized(
            "Only trusted partners can perform this action.".to_string(),
        ));
    }

    Ok(())
}

pub fn assert_accepted_latest_terms_and_conditions(caller: &Principal) -> ApiResult {
    assert_authenticated(caller)?;

    if is_controller(caller) {
        return Ok(());
    }

    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;

    if !terms_and_conditions_repository::has_accepted_latest_terms_and_conditions(user_id) {
        return Err(ApiError::unauthorized(
            "The latest terms and conditions must be accepted to perform this action.".to_string(),
        ));
    }

    Ok(())
}
