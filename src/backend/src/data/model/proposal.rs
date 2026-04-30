use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor, Uuid};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub project_id: Uuid,
    pub status: ProposalStatus,
    pub operation: ProposalOperation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalStatus {
    Open,
    PendingApproval {
        threshold: u32,
        approvers: Vec<Principal>,
        votes: Vec<(Principal, Vote)>,
    },
    Rejected,
    Executing,
    Executed,
    Failed(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Vote {
    Approve,
    Reject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalOperation {
    CreateCanister,
    AddCanisterController {
        canister_id: Principal,
        controller_id: Principal,
    },
}

impl Storable for Proposal {
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
