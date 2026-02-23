use candid::Principal;

pub const MIN_PRINCIPAL: Principal = Principal::from_slice(&[0x00; Principal::MAX_LENGTH_IN_BYTES]);
pub const MAX_PRINCIPAL: Principal = Principal::from_slice(&[0xFF; Principal::MAX_LENGTH_IN_BYTES]);
