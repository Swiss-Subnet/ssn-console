use crate::data::UserId;
use canister_utils::{deserialize_cbor, serialize_cbor, Id};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

pub type TermsAndConditionsId = Id<TermsAndConditions>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TermsAndConditions {
    pub content: String,
    pub comment: String,
    pub created_at: u64,
    pub created_by: UserId,
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
