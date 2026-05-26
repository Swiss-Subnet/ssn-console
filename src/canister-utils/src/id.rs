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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{deserialize_cbor, serialize_cbor};
    use serde::{Deserialize, Serialize};

    struct Marker;

    #[test]
    fn cbor_encoding_matches_uuid_standalone() {
        let uuid = Uuid::new();
        let id: Id<Marker> = Id::from_uuid(uuid);
        assert_eq!(serialize_cbor(&uuid), serialize_cbor(&id));
    }

    #[test]
    fn cbor_encoding_matches_uuid_inside_struct() {
        #[derive(Serialize)]
        struct WithUuid {
            id: Uuid,
        }
        #[derive(Serialize)]
        struct WithId {
            id: Id<Marker>,
        }
        let uuid = Uuid::new();
        let a = WithUuid { id: uuid };
        let b = WithId {
            id: Id::from_uuid(uuid),
        };
        assert_eq!(serialize_cbor(&a), serialize_cbor(&b));
    }

    #[test]
    fn cbor_uuid_payload_deserializes_into_id() {
        let uuid = Uuid::new();
        let bytes = serialize_cbor(&uuid);
        let id: Id<Marker> = deserialize_cbor(&bytes);
        assert_eq!(id.into_uuid(), uuid);
    }

    #[test]
    fn cbor_id_payload_deserializes_into_uuid() {
        let original: Id<Marker> = Id::new();
        let bytes = serialize_cbor(&original);
        let uuid: Uuid = deserialize_cbor(&bytes);
        assert_eq!(uuid, original.into_uuid());
    }

    #[test]
    fn cbor_struct_with_uuid_field_deserializes_into_struct_with_id_field() {
        #[derive(Serialize)]
        struct Before {
            project_id: Uuid,
        }
        #[derive(Deserialize)]
        struct After {
            project_id: Id<Marker>,
        }
        let uuid = Uuid::new();
        let bytes = serialize_cbor(&Before { project_id: uuid });
        let after: After = deserialize_cbor(&bytes);
        assert_eq!(after.project_id.into_uuid(), uuid);
    }

    // Storable is what stable-storage uses for BTreeMap/BTreeSet keys (not
    // CBOR). Key encoding must be byte-identical or existing on-stable data
    // becomes unreadable after a Uuid -> Id<T> field flip.
    #[test]
    fn storable_bytes_match_uuid() {
        for _ in 0..16 {
            let uuid = Uuid::new();
            let id: Id<Marker> = Id::from_uuid(uuid);
            assert_eq!(uuid.to_bytes(), id.to_bytes());
            assert_eq!(
                uuid.into_bytes(),
                Id::<Marker>::from_uuid(uuid).into_bytes()
            );
        }
    }

    #[test]
    fn storable_round_trip() {
        let original: Id<Marker> = Id::new();
        let bytes = original.to_bytes();
        let decoded = Id::<Marker>::from_bytes(bytes);
        assert_eq!(original, decoded);
    }

    // BTreeMap/BTreeSet range queries rely on Ord matching the byte order
    // of the stored representation. If these diverge, range scans silently
    // skip rows or return them in the wrong order.
    #[test]
    fn ord_matches_storable_byte_order() {
        let mut ids: Vec<Id<Marker>> = (0..32).map(|_| Id::new()).collect();
        ids.push(Id::MIN);
        ids.push(Id::MAX);
        for a in &ids {
            for b in &ids {
                assert_eq!(
                    a.cmp(b),
                    a.to_bytes().as_ref().cmp(b.to_bytes().as_ref()),
                    "Ord disagrees with byte order for {a} vs {b}",
                );
            }
        }
    }

    // Tuple keys (e.g. BTreeSet<(OrgId, UserId)>) encode via the tuple
    // Storable impl, which concatenates the components' Storable bytes.
    // Equivalence of the inner Storable should imply equivalence of the
    // tuple, but assert it explicitly so a future refactor of either layer
    // can't break the implication unnoticed.
    #[test]
    fn storable_tuple_bytes_match_uuid_tuple() {
        struct OtherMarker;
        for _ in 0..16 {
            let a = Uuid::new();
            let b = Uuid::new();
            let uuid_pair = (a, b);
            let id_pair = (Id::<Marker>::from_uuid(a), Id::<OtherMarker>::from_uuid(b));
            assert_eq!(uuid_pair.to_bytes(), id_pair.to_bytes());
        }
    }

    // BOUND drives index-key layout sizing inside ic-stable-structures. A
    // mismatch between Id<T>::BOUND and Uuid::BOUND would change tuple key
    // size and corrupt range query behavior.
    #[test]
    fn bound_matches_uuid() {
        let id_bound = Id::<Marker>::BOUND;
        let uuid_bound = Uuid::BOUND;
        match (id_bound, uuid_bound) {
            (
                Bound::Bounded {
                    max_size: a,
                    is_fixed_size: af,
                },
                Bound::Bounded {
                    max_size: b,
                    is_fixed_size: bf,
                },
            ) => {
                assert_eq!(a, b);
                assert_eq!(af, bf);
            }
            _ => panic!("expected both bounds to be Bounded"),
        }
    }
}
