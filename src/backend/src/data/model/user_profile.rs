use crate::utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub email: Option<String>,
    pub status: UserStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UserStatus {
    Active,
    Inactive,
}

impl Default for UserProfile {
    fn default() -> Self {
        Self {
            email: None,
            status: UserStatus::Inactive,
        }
    }
}

impl Storable for UserProfile {
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
