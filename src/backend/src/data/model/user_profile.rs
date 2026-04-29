use super::StaffPermissions;
use canister_utils::{deserialize_cbor, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

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
