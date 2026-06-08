use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor, Id};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

pub type TrustedPartnerId = Id<TrustedPartner>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedPartner {
    pub name: String,
    pub principal: Principal,
}

impl Storable for TrustedPartner {
    fn into_bytes(self) -> Vec<u8> {
        serialize_cbor(&self)
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(serialize_cbor(self))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        deserialize_cbor(&bytes)
    }

    const BOUND: Bound = Bound::Unbounded;
}
