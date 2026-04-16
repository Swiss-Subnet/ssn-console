use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor, Uuid};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum InviteTarget {
    Email(String),
    UserId(Uuid),
    Principal(Principal),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum InviteStatus {
    Pending,
    Accepted,
    Declined,
    Revoked,
}

impl InviteStatus {
    pub fn as_u8(&self) -> u8 {
        match self {
            InviteStatus::Pending => 0,
            InviteStatus::Accepted => 1,
            InviteStatus::Declined => 2,
            InviteStatus::Revoked => 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgInvite {
    pub org_id: Uuid,
    pub created_by: Uuid,
    pub created_at_ns: u64,
    pub expires_at_ns: u64,
    pub target: InviteTarget,
    pub status: InviteStatus,
}

impl Storable for OrgInvite {
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
