use canister_utils::{ApiError, ApiResult};

const MAX_ORG_NAME_LENGTH: usize = 100;
const MAX_TEAM_NAME_LENGTH: usize = 100;
const MAX_PROJECT_NAME_LENGTH: usize = 100;
const MAX_CANISTER_NAME_LENGTH: usize = 100;

fn validate_bounded_name(subject: &str, value: String, max: usize) -> ApiResult<String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(ApiError::client_error(format!(
            "{subject} cannot be empty."
        )));
    }
    if trimmed.len() > max {
        return Err(ApiError::client_error(format!(
            "{subject} cannot exceed {max} characters."
        )));
    }
    Ok(trimmed)
}

#[derive(Debug, Clone)]
pub struct OrgName(String);

impl OrgName {
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for OrgName {
    type Error = ApiError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        validate_bounded_name("Organization name", value, MAX_ORG_NAME_LENGTH).map(OrgName)
    }
}

#[derive(Debug, Clone)]
pub struct TeamName(String);

impl TeamName {
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for TeamName {
    type Error = ApiError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        validate_bounded_name("Team name", value, MAX_TEAM_NAME_LENGTH).map(TeamName)
    }
}

#[derive(Debug, Clone)]
pub struct ProjectName(String);

impl ProjectName {
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for ProjectName {
    type Error = ApiError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        validate_bounded_name("Project name", value, MAX_PROJECT_NAME_LENGTH).map(ProjectName)
    }
}

#[derive(Debug, Clone)]
pub struct CanisterName(String);

impl CanisterName {
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for CanisterName {
    type Error = ApiError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        validate_bounded_name("Canister name", value, MAX_CANISTER_NAME_LENGTH).map(CanisterName)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn org_name_trims_whitespace() {
        let name = OrgName::try_from("  Acme  ".to_string()).unwrap();
        assert_eq!(name.into_inner(), "Acme");
    }

    #[test]
    fn org_name_rejects_empty() {
        let err = OrgName::try_from("".to_string()).unwrap_err();
        assert!(err.message().contains("Organization name cannot be empty"));
    }

    #[test]
    fn org_name_rejects_whitespace_only() {
        let err = OrgName::try_from("   ".to_string()).unwrap_err();
        assert!(err.message().contains("Organization name cannot be empty"));
    }

    #[test]
    fn org_name_rejects_too_long() {
        let long = "a".repeat(MAX_ORG_NAME_LENGTH + 1);
        let err = OrgName::try_from(long).unwrap_err();
        assert!(err.message().contains("cannot exceed"));
    }

    #[test]
    fn org_name_accepts_max_length() {
        let at_max = "a".repeat(MAX_ORG_NAME_LENGTH);
        let name = OrgName::try_from(at_max.clone()).unwrap();
        assert_eq!(name.into_inner(), at_max);
    }

    #[test]
    fn team_name_trims_whitespace() {
        let name = TeamName::try_from("  Platform  ".to_string()).unwrap();
        assert_eq!(name.into_inner(), "Platform");
    }

    #[test]
    fn team_name_rejects_empty() {
        let err = TeamName::try_from("".to_string()).unwrap_err();
        assert!(err.message().contains("Team name cannot be empty"));
    }

    #[test]
    fn team_name_rejects_too_long() {
        let long = "a".repeat(MAX_TEAM_NAME_LENGTH + 1);
        let err = TeamName::try_from(long).unwrap_err();
        assert!(err.message().contains("cannot exceed"));
    }

    #[test]
    fn canister_name_trims_whitespace() {
        let name = CanisterName::try_from("  Ledger  ".to_string()).unwrap();
        assert_eq!(name.into_inner(), "Ledger");
    }

    #[test]
    fn canister_name_rejects_empty() {
        let err = CanisterName::try_from("".to_string()).unwrap_err();
        assert!(err.message().contains("Canister name cannot be empty"));
    }

    #[test]
    fn canister_name_rejects_whitespace_only() {
        let err = CanisterName::try_from("   ".to_string()).unwrap_err();
        assert!(err.message().contains("Canister name cannot be empty"));
    }

    #[test]
    fn canister_name_rejects_too_long() {
        let long = "a".repeat(MAX_CANISTER_NAME_LENGTH + 1);
        let err = CanisterName::try_from(long).unwrap_err();
        assert!(err.message().contains("cannot exceed"));
    }
}
