use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubnetCanisterRangeInfo {
    pub canister_ranges: Vec<(Principal, Principal)>,
}

impl Storable for SubnetCanisterRangeInfo {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanisterChangeInfo {
    pub total_num_changes: u64,
    pub stored_num_changes: u64,
    pub missed_ranges: Vec<(u64, u64)>,
    pub is_deleted: bool,
}

impl Storable for CanisterChangeInfo {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanisterChange {
    pub canister_id: Principal,
    pub timestamp_nanos: u64,
    pub canister_version: u64,
    pub origin: CanisterChangeOrigin,
    pub details: Option<CanisterChangeDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CanisterChangeOrigin {
    FromUser {
        user_id: Principal,
    },
    FromCanister {
        canister_id: Principal,
        canister_version: Option<u64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CanisterChangeDetails {
    Creation {
        controllers: Vec<Principal>,
        environment_variables_hash: Option<Vec<u8>>,
    },
    CodeUninstall,
    CodeDeployment {
        mode: CodeDeploymentMode,
        module_hash: Vec<u8>,
    },
    LoadSnapshot {
        from_canister_id: Option<Principal>,
        snapshot_id: Vec<u8>,
        canister_version: u64,
        taken_at_timestamp: u64,
        source: SnapshotSource,
    },
    ControllersChange {
        controllers: Vec<Principal>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CodeDeploymentMode {
    Install,
    Reinstall,
    Upgrade,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SnapshotSource {
    TakenFromCanister,
    MetadataUpload,
}

impl Storable for CanisterChange {
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
