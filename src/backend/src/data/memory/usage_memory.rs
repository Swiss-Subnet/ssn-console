use crate::data::{
    memory::{get_memory, Memory, CANISTER_USAGE_MEMORY_ID, PROJECT_USAGE_MEMORY_ID},
    CanisterUsage, ProjectUsage,
};
use candid::Principal;
use canister_utils::Uuid;
use ic_stable_structures::{storable::Bound, StableBTreeMap, Storable};
use std::borrow::Cow;

// billing month is a string date in the form YYYY-MM
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct BillingMonth(pub String);

impl Storable for BillingMonth {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        BillingMonth(String::from_utf8(bytes.into_owned()).unwrap_or_default())
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 7,
        is_fixed_size: false,
    };
}

pub type CanisterUsageMemory = StableBTreeMap<(Principal, BillingMonth), CanisterUsage, Memory>;
pub type ProjectUsageMemory = StableBTreeMap<(Uuid, BillingMonth), ProjectUsage, Memory>;

pub fn init_canister_usage() -> CanisterUsageMemory {
    CanisterUsageMemory::init(get_memory(CANISTER_USAGE_MEMORY_ID))
}

pub fn init_project_usage() -> ProjectUsageMemory {
    ProjectUsageMemory::init(get_memory(PROJECT_USAGE_MEMORY_ID))
}
