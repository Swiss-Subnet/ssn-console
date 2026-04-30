use crate::constants::{MAX_FREE_CANISTERS, MAX_PRO_CANISTERS};
use canister_utils::{deserialize_cbor, now_nanos, serialize_cbor};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

// PlanTier is persisted (as a field of OrganizationBillingPlan, CBOR-
// encoded into stable memory), so its on-wire form must outlive any Rust
// rename. Discriminants are pinned explicitly and the enum is serialized
// as `u8` via `#[serde(into / try_from)]`, so renaming `Pro` -> `Standard`
// in source has zero effect on stored records.
//
// Discriminants are append-only: never reuse a freed value, and never
// renumber an existing variant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(into = "u8", try_from = "u8")]
#[repr(u8)]
pub enum PlanTier {
    Free = 0,
    Pro = 1,
    Enterprise = 2,
}

impl From<PlanTier> for u8 {
    fn from(tier: PlanTier) -> Self {
        tier as u8
    }
}

impl TryFrom<u8> for PlanTier {
    type Error = String;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Free),
            1 => Ok(Self::Pro),
            2 => Ok(Self::Enterprise),
            // Errors loudly on unknown discriminants rather than falling
            // back. A silent downgrade to Free would be safer for limit
            // enforcement but could mask a rolled-back binary that wrote
            // a newer tier; failing surfaces the inconsistency to ops.
            other => Err(format!("Unknown PlanTier discriminant: {other}")),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanLimits {
    pub max_canisters: u32,
    // Storage is reserved for the metric-aggregation phase. None means
    // "not enforced yet"; the field exists so plans persisted now remain
    // readable once enforcement lands.
    pub max_storage_bytes: Option<u64>,
    // etc.
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrganizationBillingPlan {
    pub tier: PlanTier,
    // Limits are stored explicitly, not derived from `tier`, so each org
    // carries a snapshot of the limits in force when its plan was last
    // updated. This matters most for Pro: when Pro defaults change (price
    // or quotas), existing Pro subscribers can be grandfathered onto their
    // original terms while new sign-ups get the new defaults. Enterprise
    // uses the same field for fully custom limits.
    pub limits: PlanLimits,
    // Identifier supplied by the off-chain billing gateway (e.g. a Payrexx
    // subscription id). The canister never dereferences it; it is stored
    // so the stateless gateway can resolve org_id -> subscription_id when
    // a member triggers a cancellation or modification.
    pub external_ref: Option<String>,
    pub updated_at: u64,
}

impl Default for OrganizationBillingPlan {
    // Free is the implicit plan for any org without a persisted record,
    // so it is also the natural Default. Pro and Enterprise are assigned
    // explicitly via the off-chain gateway or the admin UI.
    fn default() -> Self {
        Self {
            tier: PlanTier::Free,
            limits: PlanLimits {
                max_canisters: MAX_FREE_CANISTERS,
                max_storage_bytes: None,
            },
            external_ref: None,
            updated_at: now_nanos(),
        }
    }
}

impl OrganizationBillingPlan {
    // Snapshot of the current Free defaults. Equivalent to `default()`,
    // exposed under this name for symmetry with `pro_snapshot()` so call
    // sites read uniformly when persisting a tier assignment.
    pub fn free_snapshot() -> Self {
        Self::default()
    }

    // Snapshot of the current Pro defaults. The result is meant to be
    // persisted at assignment time; later changes to MAX_PRO_CANISTERS
    // do not retroactively apply to orgs already on Pro.
    pub fn pro_snapshot() -> Self {
        Self {
            tier: PlanTier::Pro,
            limits: PlanLimits {
                max_canisters: MAX_PRO_CANISTERS,
                max_storage_bytes: None,
            },
            external_ref: None,
            updated_at: now_nanos(),
        }
    }
}

impl Storable for OrganizationBillingPlan {
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

    #[test]
    fn default_is_free_tier() {
        let plan = OrganizationBillingPlan::default();
        assert_eq!(plan.tier, PlanTier::Free);
        assert_eq!(plan.limits.max_canisters, MAX_FREE_CANISTERS);
        assert_eq!(plan.limits.max_storage_bytes, None);
        assert!(plan.external_ref.is_none());
    }

    #[test]
    fn free_snapshot_matches_default() {
        assert_eq!(
            OrganizationBillingPlan::free_snapshot(),
            OrganizationBillingPlan::default(),
        );
    }

    #[test]
    fn pro_snapshot_has_pro_tier_defaults() {
        let plan = OrganizationBillingPlan::pro_snapshot();
        assert_eq!(plan.tier, PlanTier::Pro);
        assert_eq!(plan.limits.max_canisters, MAX_PRO_CANISTERS);
    }

    #[test]
    fn round_trip_preserves_fields() {
        let plan = OrganizationBillingPlan {
            tier: PlanTier::Enterprise,
            limits: PlanLimits {
                max_canisters: 1000,
                max_storage_bytes: Some(1 << 40),
            },
            external_ref: Some("payrexx_sub_abc123".to_string()),
            updated_at: 1_700_000_000_000_000_000,
        };
        let bytes = plan.to_bytes();
        let decoded = OrganizationBillingPlan::from_bytes(bytes);
        assert_eq!(plan, decoded);
    }

    // Guards the u8 discriminant for every PlanTier variant. Stored
    // records embed these numbers; if a discriminant is ever renumbered
    // or reused, this test fails before broken data ships.
    #[test]
    fn plan_tier_discriminants_are_pinned() {
        assert_eq!(u8::from(PlanTier::Free), 0);
        assert_eq!(u8::from(PlanTier::Pro), 1);
        assert_eq!(u8::from(PlanTier::Enterprise), 2);
    }

    #[test]
    fn plan_tier_round_trip_via_u8() {
        for tier in [PlanTier::Free, PlanTier::Pro, PlanTier::Enterprise] {
            let n: u8 = tier.into();
            assert_eq!(PlanTier::try_from(n).unwrap(), tier);
        }
    }

    #[test]
    fn plan_tier_unknown_discriminant_errors() {
        assert!(PlanTier::try_from(255).is_err());
    }
}
