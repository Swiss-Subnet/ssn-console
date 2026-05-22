use super::StaffPermissions;
use crate::validation::Email;
use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

/// A principal linked to a user account, paired with its optional display
/// name. Returned by the repository when listing all principals owned by a
/// given user.
#[derive(Debug, Clone)]
pub struct LinkedPrincipal {
    pub principal: Principal,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub email: Option<String>,
    #[serde(default)]
    pub email_verified: bool,
    pub status: UserStatus,
    // Cross-org staff capabilities. None means the user is a regular
    // member; Some(perms) marks them as business-team staff with the
    // listed authority. `#[serde(default)]` keeps existing CBOR records
    // (written before this field existed) readable as None.
    #[serde(default)]
    pub staff_permissions: Option<StaffPermissions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UserStatus {
    Active,
    Inactive,
}

impl Default for UserProfile {
    fn default() -> Self {
        Self {
            email: None,
            email_verified: false,
            status: UserStatus::Inactive,
            staff_permissions: None,
        }
    }
}

// Unbounded because ic_stable_structures forbids raising a Bounded
// max_size in place; oversize is already rejected by validation::Email.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct VerifiedEmailKey(String);

impl VerifiedEmailKey {
    // Migration-only: legacy rows weren't normalized at write time, so
    // we re-normalize here rather than going through Email::try_from,
    // which would reject otherwise-recoverable malformed addresses.
    // Skips shape validation — never call on user-supplied input.
    pub(crate) fn from_legacy_storage_unchecked(raw: &str) -> Option<Self> {
        let normalized = raw.trim().to_lowercase();
        if normalized.is_empty() {
            None
        } else {
            Some(Self(normalized))
        }
    }
}

impl From<Email> for VerifiedEmailKey {
    fn from(email: Email) -> Self {
        Self(email.into_inner())
    }
}

impl Storable for VerifiedEmailKey {
    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.into_owned()).expect("verified email key must be valid UTF-8"))
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for UserProfile {
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

#[cfg(test)]
mod tests {
    use super::*;

    // Mirror the pre-staff_permissions UserProfile shape and its CBOR
    // serializer so we can synthesize a record exactly as it was written
    // by an older binary, then assert the current code reads it back
    // without panicking and lands `staff_permissions` at None. If anyone
    // ever removes the `#[serde(default)]` on `staff_permissions`, or
    // changes the field order in a way that breaks the on-wire shape,
    // this test fails before the change can ship and brick existing data.
    #[derive(Serialize)]
    struct LegacyUserProfile {
        email: Option<String>,
        email_verified: bool,
        status: UserStatus,
    }

    #[test]
    fn legacy_cbor_round_trip_lands_none() {
        let legacy = LegacyUserProfile {
            email: Some("user@example.com".to_string()),
            email_verified: true,
            status: UserStatus::Active,
        };
        let bytes = serialize_cbor(&legacy);

        let decoded = UserProfile::from_bytes(Cow::Owned(bytes));
        assert_eq!(decoded.email.as_deref(), Some("user@example.com"));
        assert!(decoded.email_verified);
        assert_eq!(decoded.status, UserStatus::Active);
        assert!(
            decoded.staff_permissions.is_none(),
            "legacy CBOR records must deserialize as non-staff",
        );
    }

    #[test]
    fn round_trip_preserves_staff_permissions() {
        let profile = UserProfile {
            email: None,
            email_verified: false,
            status: UserStatus::Active,
            staff_permissions: Some(StaffPermissions::OPERATOR),
        };
        let bytes = profile.clone().into_bytes();
        let decoded = UserProfile::from_bytes(Cow::Owned(bytes));
        assert_eq!(decoded.staff_permissions, Some(StaffPermissions::OPERATOR));
    }

    #[test]
    fn default_profile_is_not_staff() {
        assert!(UserProfile::default().staff_permissions.is_none());
    }
}
