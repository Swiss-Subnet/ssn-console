use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ApprovalPolicy {
    pub policy_type: PolicyType,
}

impl Default for ApprovalPolicy {
    fn default() -> Self {
        Self {
            policy_type: PolicyType::AutoApprove,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PolicyType {
    AutoApprove,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(u8)]
pub enum OperationType {
    CreateCanister = 0,
    Noop = 254,
    AddCanisterController = 255,
}

impl OperationType {
    pub fn min() -> Self {
        Self::CreateCanister
    }

    pub fn max() -> Self {
        Self::AddCanisterController
    }
}

impl Storable for ApprovalPolicy {
    fn into_bytes(self) -> Vec<u8> {
        serialize_cbor(&self)
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(serialize_cbor(&self))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        deserialize_cbor(&bytes)
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for PolicyType {
    fn into_bytes(self) -> Vec<u8> {
        serialize_cbor(&self)
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(serialize_cbor(&self))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        deserialize_cbor(&bytes)
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for OperationType {
    fn into_bytes(self) -> Vec<u8> {
        vec![self as u8]
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(vec![*self as u8])
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        match bytes.first() {
            Some(0) => OperationType::CreateCanister,
            Some(255) => OperationType::AddCanisterController,
            _ => OperationType::Noop,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: size_of::<u8>() as u32,
        is_fixed_size: true,
    };
}
