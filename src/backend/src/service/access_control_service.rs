use crate::data::trusted_partner_repository;
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
