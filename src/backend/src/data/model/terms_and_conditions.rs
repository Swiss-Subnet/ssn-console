use crate::{
    data::Uuid,
    utils::{deserialize_cbor, serialize_cbor},
};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TermsAndConditions {
    pub content: String,
    pub comment: String,
    pub created_at: u64,
    pub created_by: Uuid,
}

impl Storable for TermsAndConditions {
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
