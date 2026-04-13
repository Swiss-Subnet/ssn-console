use canister_utils::{deserialize_cbor, serialize_cbor, Uuid};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    // Falls back to nil UUID when deserializing teams created before
    // this field existed. The organization_team_index is the
    // authoritative source for old records.
    #[serde(default)]
    pub org_id: Uuid,
    pub name: String,
}

impl Storable for Team {
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
