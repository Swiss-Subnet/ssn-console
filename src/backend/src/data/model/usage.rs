use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Usage {
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

impl Storable for Usage {
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

// billing month is a string date in the form YYYY-MM
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct BillingMonth(String);

impl Storable for BillingMonth {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        BillingMonth(String::from_utf8(bytes.into_owned()).unwrap())
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 7,
        is_fixed_size: true,
    };
}

impl BillingMonth {
    pub fn new(val: String) -> Self {
        let instance = Self(val);
        instance.validate();
        instance
    }

    fn validate(&self) {
        assert_eq!(self.0.len(), 7, "billing_month must be 7 characters");
        let parts: Vec<&str> = self.0.split('-').collect();
        assert_eq!(parts.len(), 2, "billing_month must be in YYYY-MM format");
        assert_eq!(parts[0].len(), 4, "billing_month must be in YYYY-MM format");
        assert_eq!(parts[1].len(), 2, "billing_month must be in YYYY-MM format");
        assert!(
            parts[0].chars().all(|c| c.is_ascii_digit()),
            "billing_month must be in YYYY-MM format"
        );
        assert!(
            parts[1].chars().all(|c| c.is_ascii_digit()),
            "billing_month must be in YYYY-MM format"
        );

        let month = parts[1].parse::<u8>().unwrap_or(0);
        assert!((1..=12).contains(&month), "month must be between 01 and 12");
    }
}
