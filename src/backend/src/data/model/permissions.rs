use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OrgPermissions(u64);

#[allow(dead_code)]
impl OrgPermissions {
    pub const EMPTY: Self = Self(0);

    // Full administrative control over the organization. Implies all other
    // org-level permissions. Holders can change billing, delete the org,
    // and perform any action that a more specific flag would grant.
    pub const ORG_ADMIN: Self = Self(1 << 0);

    // Invite new members to the organization, remove existing members, and
    // change their team assignments. Does NOT grant the ability to change
    // a member's permissions (that requires ORG_ADMIN).
    pub const MEMBER_MANAGE: Self = Self(1 << 1);

    // Create, rename, and delete teams within the organization. Also
    // covers updating team metadata (description, display name). Adding
    // or removing users from a team requires MEMBER_MANAGE.
    pub const TEAM_MANAGE: Self = Self(1 << 2);

    // Create new projects inside the organization. The creating team
    // automatically receives PROJECT_ADMIN on the new project. Deleting
    // a project requires PROJECT_ADMIN on the project itself.
    pub const PROJECT_CREATE: Self = Self(1 << 3);

    // View and modify billing information, payment methods, and spending
    // limits for the organization. Read-only billing summaries are
    // available to any authenticated org member.
    pub const BILLING_MANAGE: Self = Self(1 << 4);

    pub const ALL: Self = Self(
        Self::ORG_ADMIN.0
            | Self::MEMBER_MANAGE.0
            | Self::TEAM_MANAGE.0
            | Self::PROJECT_CREATE.0
            | Self::BILLING_MANAGE.0,
    );

    pub const fn contains(self, other: Self) -> bool {
        self.0 & other.0 == other.0
    }

    pub const fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }
}

impl fmt::Display for OrgPermissions {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        const FLAGS: &[(OrgPermissions, &str)] = &[
            (OrgPermissions::ORG_ADMIN, "ORG_ADMIN"),
            (OrgPermissions::MEMBER_MANAGE, "MEMBER_MANAGE"),
            (OrgPermissions::TEAM_MANAGE, "TEAM_MANAGE"),
            (OrgPermissions::PROJECT_CREATE, "PROJECT_CREATE"),
            (OrgPermissions::BILLING_MANAGE, "BILLING_MANAGE"),
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

impl Storable for OrgPermissions {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.to_le_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let arr: [u8; 8] = bytes.as_ref().try_into().unwrap();
        Self(u64::from_le_bytes(arr))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProjectPermissions(u64);

#[allow(dead_code)]
impl ProjectPermissions {
    pub const EMPTY: Self = Self(0);

    // Full administrative control over the project. Implies all other
    // project-level permissions. Holders can delete the project, manage
    // approval policies, and change team permission assignments.
    pub const PROJECT_ADMIN: Self = Self(1 << 0);

    // Create, delete, and update top-level settings of canisters within
    // the project (install/upgrade WASM, change controllers, adjust
    // compute and memory allocations). Does not cover routine operational
    // actions like start/stop (see CANISTER_OPERATE).
    pub const CANISTER_MANAGE: Self = Self(1 << 1);

    // Submit new proposals for changes that require multi-party approval
    // (e.g. canister upgrades gated by an approval policy). Creating a
    // proposal does not execute it; execution requires enough approvals
    // as defined by the project's approval policy.
    pub const PROPOSAL_CREATE: Self = Self(1 << 2);

    // Cast an approval or rejection vote on an existing proposal. A
    // principal that both creates and approves a proposal counts as one
    // approval; approval policies may require distinct approvers.
    pub const PROPOSAL_APPROVE: Self = Self(1 << 3);

    // Start, stop, and query the status of canisters. This is the
    // day-to-day operational permission for running workloads without
    // granting the ability to change canister code or controllers.
    pub const CANISTER_OPERATE: Self = Self(1 << 4);

    // Read canister logs, metrics, and cycle balance. Grants visibility
    // into canister health without the ability to mutate anything.
    pub const CANISTER_READ: Self = Self(1 << 5);

    // Create, update, and delete approval policies that govern which
    // proposal types require approval and how many approvers are needed.
    // Viewing existing policies is available to any project member.
    pub const APPROVAL_POLICY_MANAGE: Self = Self(1 << 6);

    // Update project metadata (name, description, tags) without having
    // full PROJECT_ADMIN. Does not grant permission to delete the project
    // or change team assignments.
    pub const PROJECT_SETTINGS: Self = Self(1 << 7);

    pub const ALL: Self = Self(
        Self::PROJECT_ADMIN.0
            | Self::CANISTER_MANAGE.0
            | Self::PROPOSAL_CREATE.0
            | Self::PROPOSAL_APPROVE.0
            | Self::CANISTER_OPERATE.0
            | Self::CANISTER_READ.0
            | Self::APPROVAL_POLICY_MANAGE.0
            | Self::PROJECT_SETTINGS.0,
    );

    pub const fn contains(self, other: Self) -> bool {
        self.0 & other.0 == other.0
    }

    pub const fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }
}

impl fmt::Display for ProjectPermissions {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        const FLAGS: &[(ProjectPermissions, &str)] = &[
            (ProjectPermissions::PROJECT_ADMIN, "PROJECT_ADMIN"),
            (ProjectPermissions::CANISTER_MANAGE, "CANISTER_MANAGE"),
            (ProjectPermissions::PROPOSAL_CREATE, "PROPOSAL_CREATE"),
            (ProjectPermissions::PROPOSAL_APPROVE, "PROPOSAL_APPROVE"),
            (ProjectPermissions::CANISTER_OPERATE, "CANISTER_OPERATE"),
            (ProjectPermissions::CANISTER_READ, "CANISTER_READ"),
            (
                ProjectPermissions::APPROVAL_POLICY_MANAGE,
                "APPROVAL_POLICY_MANAGE",
            ),
            (ProjectPermissions::PROJECT_SETTINGS, "PROJECT_SETTINGS"),
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

impl Storable for ProjectPermissions {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.to_le_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let arr: [u8; 8] = bytes.as_ref().try_into().unwrap();
        Self(u64::from_le_bytes(arr))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    // Bump these counts when adding new permission flags.
    const ORG_FLAG_COUNT: u32 = 5;
    const PROJECT_FLAG_COUNT: u32 = 8;

    #[test]
    fn org_all_covers_every_flag() {
        assert_eq!(
            OrgPermissions::ALL.0.count_ones(),
            ORG_FLAG_COUNT,
            "OrgPermissions::ALL has {} bits but expected {}; \
             update ALL or ORG_FLAG_COUNT when adding/removing a flag",
            OrgPermissions::ALL.0.count_ones(),
            ORG_FLAG_COUNT,
        );
    }

    #[test]
    fn project_all_covers_every_flag() {
        assert_eq!(
            ProjectPermissions::ALL.0.count_ones(),
            PROJECT_FLAG_COUNT,
            "ProjectPermissions::ALL has {} bits but expected {}; \
             update ALL or PROJECT_FLAG_COUNT when adding/removing a flag",
            ProjectPermissions::ALL.0.count_ones(),
            PROJECT_FLAG_COUNT,
        );
    }

    #[test]
    fn org_permissions_display() {
        assert_eq!(OrgPermissions::EMPTY.to_string(), "EMPTY");
        assert_eq!(OrgPermissions::ORG_ADMIN.to_string(), "ORG_ADMIN");
        assert_eq!(
            OrgPermissions::MEMBER_MANAGE
                .union(OrgPermissions::TEAM_MANAGE)
                .to_string(),
            "MEMBER_MANAGE | TEAM_MANAGE",
        );
        assert_eq!(
            OrgPermissions::ALL.to_string(),
            "ORG_ADMIN | MEMBER_MANAGE | TEAM_MANAGE | PROJECT_CREATE | BILLING_MANAGE",
        );
    }

    #[test]
    fn project_permissions_display() {
        assert_eq!(ProjectPermissions::EMPTY.to_string(), "EMPTY");
        assert_eq!(
            ProjectPermissions::CANISTER_MANAGE.to_string(),
            "CANISTER_MANAGE",
        );
        assert_eq!(
            ProjectPermissions::PROJECT_ADMIN
                .union(ProjectPermissions::CANISTER_MANAGE)
                .to_string(),
            "PROJECT_ADMIN | CANISTER_MANAGE",
        );
        assert_eq!(
            ProjectPermissions::ALL.to_string(),
            "PROJECT_ADMIN | CANISTER_MANAGE | PROPOSAL_CREATE | PROPOSAL_APPROVE \
             | CANISTER_OPERATE | CANISTER_READ | APPROVAL_POLICY_MANAGE | PROJECT_SETTINGS",
        );
    }
}
