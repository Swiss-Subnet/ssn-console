use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OrgPermissions(u64);

#[allow(dead_code)]
impl OrgPermissions {
    pub const EMPTY: Self = Self(0);
    pub const ORG_ADMIN: Self = Self(1 << 0);

    pub const ALL: Self = Self(Self::ORG_ADMIN.0);

    pub const fn contains(self, other: Self) -> bool {
        self.0 & other.0 == other.0
    }

    pub const fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }
}

impl fmt::Display for OrgPermissions {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        const FLAGS: &[(OrgPermissions, &str)] = &[(OrgPermissions::ORG_ADMIN, "ORG_ADMIN")];

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
    pub const PROJECT_ADMIN: Self = Self(1 << 0);
    pub const CANISTER_MANAGE: Self = Self(1 << 1);
    pub const PROPOSAL_CREATE: Self = Self(1 << 2);
    pub const PROPOSAL_APPROVE: Self = Self(1 << 3);

    pub const ALL: Self = Self(
        Self::PROJECT_ADMIN.0
            | Self::CANISTER_MANAGE.0
            | Self::PROPOSAL_CREATE.0
            | Self::PROPOSAL_APPROVE.0,
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
    const ORG_FLAG_COUNT: u32 = 1;
    const PROJECT_FLAG_COUNT: u32 = 4;

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
        assert_eq!(OrgPermissions::ALL.to_string(), "ORG_ADMIN");
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
            "PROJECT_ADMIN | CANISTER_MANAGE | PROPOSAL_CREATE | PROPOSAL_APPROVE",
        );
    }
}
