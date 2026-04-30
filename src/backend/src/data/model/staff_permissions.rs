use serde::{Deserialize, Serialize};
use std::fmt;

// Cross-org capability set held by a member of the business team. Distinct
// from `OrgPermissions` (per-org) and from canister-controller status (dev/
// ops). Stored as a field of `UserProfile`, so persistence rides on
// UserProfile's CBOR encoding — `#[serde(transparent)]` keeps the on-wire
// form a plain u64 regardless of how this struct is renamed in source.
//
// Bit positions are append-only and load-bearing: once any user is granted
// a flag, that bit's meaning is permanent. Renaming a flag is fine; reusing
// or renumbering a bit silently changes the meaning of every grant already
// in stable memory. The pinning test below guards against that.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct StaffPermissions(u64);

#[allow(dead_code)]
impl StaffPermissions {
    pub const EMPTY: Self = Self(0);

    // Read access to any organization, project, or canister regardless of
    // membership. Granted to L1 customer-support staff who need to see what
    // a customer sees in order to triage tickets, with no write authority.
    pub const READ_ALL_ORGS: Self = Self(1 << 0);

    // Modify any organization's billing plan: tier, limits, external_ref.
    // The canonical caller is the off-chain billing gateway, but staff
    // operators may also use this for manual plan changes (Enterprise
    // contracts, comp accounts, suspensions).
    pub const WRITE_BILLING: Self = Self(1 << 1);

    // Bundle: read-only across all orgs. Default grant for L1 support.
    pub const SUPPORT: Self = Self::READ_ALL_ORGS;

    // Bundle: read everywhere + billing writes. Default grant for the
    // day-to-day business operations team.
    pub const OPERATOR: Self = Self(Self::READ_ALL_ORGS.0 | Self::WRITE_BILLING.0);

    // Union of every flag known to this build. Used for testing (the
    // count-ones invariant below) and as a convenience when granting full
    // staff authority. Bundles like SUPPORT/OPERATOR are *snapshots* of
    // current intent: as new flags ship, ALL expands automatically, but
    // users already granted a bundle do NOT retroactively gain new bits —
    // they were granted a specific u64, and a re-grant is required to
    // include flags added after their original grant.
    pub const ALL: Self = Self(Self::READ_ALL_ORGS.0 | Self::WRITE_BILLING.0);

    pub const fn contains(self, other: Self) -> bool {
        self.0 & other.0 == other.0
    }

    pub const fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    pub const fn bits(self) -> u64 {
        self.0
    }

    // Construct from a raw u64 without bit validation. The grant endpoint
    // is the place to reject unknown bits (so misconfigured admin UIs fail
    // loudly); deserialization stays lenient so a record persisted by a
    // newer binary remains readable after a rollback.
    pub const fn from_bits_truncate(bits: u64) -> Self {
        Self(bits)
    }
}

impl fmt::Display for StaffPermissions {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        const FLAGS: &[(StaffPermissions, &str)] = &[
            (StaffPermissions::READ_ALL_ORGS, "READ_ALL_ORGS"),
            (StaffPermissions::WRITE_BILLING, "WRITE_BILLING"),
        ];

        let mut first = true;
        for &(flag, name) in FLAGS {
            if self.contains(flag) {
                if !first {
                    f.write_str(" | ")?;
                }
                f.write_str(name)?;
                first = false;
            }
        }
        if first {
            f.write_str("EMPTY")?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Bump this when adding or removing a flag (and update ALL accordingly).
    const STAFF_FLAG_COUNT: u32 = 2;

    #[test]
    fn all_covers_every_flag() {
        assert_eq!(
            StaffPermissions::ALL.0.count_ones(),
            STAFF_FLAG_COUNT,
            "StaffPermissions::ALL has {} bits but expected {}; \
             update ALL or STAFF_FLAG_COUNT when adding/removing a flag",
            StaffPermissions::ALL.0.count_ones(),
            STAFF_FLAG_COUNT,
        );
    }

    // Bit positions are persisted; if a future change renumbers a flag,
    // every grant already in stable memory silently changes meaning.
    // This test fails before such a change can ship.
    #[test]
    fn bit_positions_are_pinned() {
        assert_eq!(StaffPermissions::READ_ALL_ORGS.0, 1 << 0);
        assert_eq!(StaffPermissions::WRITE_BILLING.0, 1 << 1);
    }

    #[test]
    fn empty_contains_nothing() {
        assert!(!StaffPermissions::EMPTY.contains(StaffPermissions::READ_ALL_ORGS));
        assert!(!StaffPermissions::EMPTY.contains(StaffPermissions::WRITE_BILLING));
    }

    #[test]
    fn empty_is_contained_by_anything() {
        assert!(StaffPermissions::ALL.contains(StaffPermissions::EMPTY));
        assert!(StaffPermissions::READ_ALL_ORGS.contains(StaffPermissions::EMPTY));
    }

    #[test]
    fn support_bundle_is_read_only() {
        assert!(StaffPermissions::SUPPORT.contains(StaffPermissions::READ_ALL_ORGS));
        assert!(!StaffPermissions::SUPPORT.contains(StaffPermissions::WRITE_BILLING));
    }

    #[test]
    fn operator_bundle_includes_support_plus_billing() {
        assert!(StaffPermissions::OPERATOR.contains(StaffPermissions::SUPPORT));
        assert!(StaffPermissions::OPERATOR.contains(StaffPermissions::WRITE_BILLING));
    }

    #[test]
    fn union_combines_flags() {
        let combined = StaffPermissions::READ_ALL_ORGS.union(StaffPermissions::WRITE_BILLING);
        assert_eq!(combined, StaffPermissions::OPERATOR);
    }

    #[test]
    fn display_lists_set_flags() {
        assert_eq!(StaffPermissions::EMPTY.to_string(), "EMPTY");
        assert_eq!(StaffPermissions::READ_ALL_ORGS.to_string(), "READ_ALL_ORGS");
        assert_eq!(
            StaffPermissions::OPERATOR.to_string(),
            "READ_ALL_ORGS | WRITE_BILLING",
        );
    }

    // Forward-compat behavior: a value persisted by a binary that knows
    // more flags must remain readable, and `contains` must still work
    // correctly because we mask rather than equate. This test is on the
    // primitive ops only; the actual CBOR-roundtrip-through-UserProfile
    // case is covered in user_profile.rs.
    #[test]
    fn unknown_bits_are_preserved_and_ignored_by_contains() {
        let with_extra = StaffPermissions::from_bits_truncate(0b111);
        assert!(with_extra.contains(StaffPermissions::READ_ALL_ORGS));
        assert!(with_extra.contains(StaffPermissions::WRITE_BILLING));
        assert_eq!(with_extra.bits(), 0b111);
    }
}
