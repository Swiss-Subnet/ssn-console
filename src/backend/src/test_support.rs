use candid::Principal;
use canister_utils::with_random_bytes;

/// A distinct 29-byte principal on every call. Random bytes, no counter to
/// keep and no number to pick: uniqueness is intrinsic. Shares the same RNG
/// path as `Uuid::new()`.
pub fn fresh_principal() -> Principal {
    with_random_bytes(|bytes: [u8; 29]| Principal::from_slice(&bytes))
}
