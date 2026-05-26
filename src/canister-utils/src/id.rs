use crate::{ApiResult, Uuid};
use core::fmt::{Debug, Display, Formatter};
use core::hash::{Hash, Hasher};
use core::marker::PhantomData;
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

// `PhantomData<fn() -> T>` (not `PhantomData<T>`) so `Id<T>` is unconditionally
// `Send + Sync + Copy` and does not inherit `T`'s drop semantics.
#[derive(Serialize, Deserialize)]
#[serde(transparent)]
pub struct Id<T>(Uuid, #[serde(skip)] PhantomData<fn() -> T>);

impl<T> Id<T> {
    pub const MIN: Self = Self(Uuid::MIN, PhantomData);
    pub const MAX: Self = Self(Uuid::MAX, PhantomData);

    pub fn new() -> Self {
        Self(Uuid::new(), PhantomData)
    }

    pub const fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid, PhantomData)
    }

    pub const fn as_uuid(&self) -> &Uuid {
        &self.0
    }

    pub const fn into_uuid(self) -> Uuid {
        self.0
    }
}

impl<T> Default for Id<T> {
    fn default() -> Self {
        Self(Uuid::default(), PhantomData)
    }
}

// Hand-rolled because deriving would impose `T: Trait` bounds that the marker
// types (Team, Project, ...) need not satisfy.
impl<T> Clone for Id<T> {
    fn clone(&self) -> Self {
        *self
    }
}
impl<T> Copy for Id<T> {}

impl<T> PartialEq for Id<T> {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}
impl<T> Eq for Id<T> {}

impl<T> PartialOrd for Id<T> {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl<T> Ord for Id<T> {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.cmp(&other.0)
    }
}

impl<T> Hash for Id<T> {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.hash(state);
    }
}

impl<T> Debug for Id<T> {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("Id").field(&self.0).finish()
    }
}

impl<T> Display for Id<T> {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Display::fmt(&self.0, f)
    }
}

impl<T> TryFrom<&str> for Id<T> {
    type Error = crate::ApiError;

    fn try_from(s: &str) -> ApiResult<Self> {
        Uuid::try_from(s).map(Self::from_uuid)
    }
}

impl<T> From<Uuid> for Id<T> {
    fn from(uuid: Uuid) -> Self {
        Self::from_uuid(uuid)
    }
}

// Byte-identical to `Uuid`'s impl so existing on-stable data round-trips
// unchanged through `Id<T>` after a migration.
impl<T> Storable for Id<T> {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        self.0.to_bytes()
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(Uuid::from_bytes(bytes), PhantomData)
    }

    const BOUND: Bound = Uuid::BOUND;
}
