use crate::data::{
    terms_and_conditions_repository, trusted_partner_repository, user_profile_repository,
};
use candid::Principal;
use ic_cdk::api::is_controller;

pub fn assert_authenticated(calling_principal: &Principal) -> Result<(), String> {
    if calling_principal == &Principal::anonymous() {
        return Err("Anonymous users are not allowed to perform this action".to_string());
    }

    Ok(())
}

pub fn assert_controller(calling_principal: &Principal) -> Result<(), String> {
    assert_authenticated(calling_principal)?;

    if !is_controller(calling_principal) {
        return Err("Only controllers can perform this action".to_string());
    }

    Ok(())
}

pub fn assert_trusted_partner(calling_principal: &Principal) -> Result<(), String> {
    assert_authenticated(calling_principal)?;

    if !trusted_partner_repository::is_trusted_partner(calling_principal) {
        return Err("Only trusted partners can perform this action".to_string());
    }

    Ok(())
}

pub fn assert_accepted_terms_of_service(calling_principal: &Principal) -> Result<(), String> {
    assert_authenticated(calling_principal)?;

    let user_id = user_profile_repository::get_user_id_by_principal(&calling_principal)
        .ok_or_else(|| {
            format!(
                "User profile for principal {} does not exist",
                calling_principal
            )
        })?;

    if !terms_and_conditions_repository::has_accepted_latest_terms_and_conditions(user_id) {
        return Err("Terms of service must be accepted to perform this action".to_string());
    }

    Ok(())
}
