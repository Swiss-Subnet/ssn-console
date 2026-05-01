use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanisterUsage {
    pub canister_id: Principal,
    pub memory: u64,
    pub memory_bytes: u64,
    pub compute_allocation: u64,
    pub compute_allocation_percent: u64,
    pub ingress_induction: u64,
    pub ingress_induction_bytes_total: u64,
    pub instructions: u64,
    pub compute_time_seconds_total: u64,
    pub request_and_response_transmission: u64,
    pub transmission_bytes_total: u64,
    pub uninstall: u64,
    pub uninstalls_total: u64,
    pub http_outcalls: u64,
    pub burned_cycles: u64,
}

impl Storable for CanisterUsage {
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectUsage {
    pub memory: u64,
    pub memory_bytes: u64,
    pub compute_allocation: u64,
    pub compute_allocation_percent: u64,
    pub ingress_induction: u64,
    pub ingress_induction_bytes_total: u64,
    pub instructions: u64,
    pub compute_time_seconds_total: u64,
    pub request_and_response_transmission: u64,
    pub transmission_bytes_total: u64,
    pub uninstall: u64,
    pub uninstalls_total: u64,
    pub http_outcalls: u64,
    pub burned_cycles: u64,
}

impl Storable for ProjectUsage {
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
