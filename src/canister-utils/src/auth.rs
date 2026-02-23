use crate::{ApiError, ApiResult};
use candid::Principal;
use ic_cdk::api::is_controller;

pub fn assert_authenticated(principal: Principal) -> ApiResult {
    if principal == Principal::anonymous() {
        return Err(ApiError::unauthenticated(
            "Anonymous principals are not allowed to perform this action".to_string(),
        ));
    }

    Ok(())
}

pub fn assert_controller(principal: Principal) -> ApiResult {
    assert_authenticated(principal)?;

    if !is_controller(&principal) {
        return Err(ApiError::unauthorized(
            "Only controllers are allowed to perform this action.".to_string(),
        ));
    }

    Ok(())
}
