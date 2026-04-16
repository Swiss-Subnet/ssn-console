use canister_utils::{ApiError, ApiResult};

const MAX_EMAIL_LENGTH: usize = 254;

// Basic shape check: non-empty local and domain parts separated by '@',
// domain must contain a '.', no whitespace. This is intentionally loose:
// full RFC 5322 validation is not the goal. Verified-email gating is
// enforced elsewhere (invite matching) where it actually matters.
fn validate_email_shape(value: &str) -> ApiResult<()> {
    if value.is_empty() {
        return Err(ApiError::client_error("Email cannot be empty.".to_string()));
    }
    if value.len() > MAX_EMAIL_LENGTH {
        return Err(ApiError::client_error(format!(
            "Email cannot exceed {MAX_EMAIL_LENGTH} characters."
        )));
    }
    if value.chars().any(char::is_whitespace) {
        return Err(ApiError::client_error(
            "Email cannot contain whitespace.".to_string(),
        ));
    }
    let Some((local, domain)) = value.split_once('@') else {
        return Err(ApiError::client_error(
            "Email must contain an '@' symbol.".to_string(),
        ));
    };
    if local.is_empty() || domain.is_empty() {
        return Err(ApiError::client_error(
            "Email must have a local and a domain part.".to_string(),
        ));
    }
    if !domain.contains('.') {
        return Err(ApiError::client_error(
            "Email domain must contain a '.'.".to_string(),
        ));
    }
    if domain.split('.').any(|part| part.is_empty()) {
        return Err(ApiError::client_error(
            "Email domain labels must not be empty.".to_string(),
        ));
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct Email(String);

impl Email {
    pub fn into_inner(self) -> String {
        self.0
    }

    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for Email {
    type Error = ApiError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        let normalized = value.trim().to_lowercase();
        validate_email_shape(&normalized)?;
        Ok(Email(normalized))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_basic_email() {
        let email = Email::try_from("alice@example.com".to_string()).unwrap();
        assert_eq!(email.into_inner(), "alice@example.com");
    }

    #[test]
    fn normalizes_to_lowercase_and_trims() {
        let email = Email::try_from("  Alice@Example.COM  ".to_string()).unwrap();
        assert_eq!(email.into_inner(), "alice@example.com");
    }

    #[test]
    fn rejects_empty() {
        let err = Email::try_from("".to_string()).unwrap_err();
        assert!(err.message().contains("Email cannot be empty"));
    }

    #[test]
    fn rejects_missing_at() {
        let err = Email::try_from("aliceexample.com".to_string()).unwrap_err();
        assert!(err.message().contains("'@'"));
    }

    #[test]
    fn rejects_missing_domain_dot() {
        let err = Email::try_from("alice@example".to_string()).unwrap_err();
        assert!(err.message().contains("domain must contain"));
    }

    #[test]
    fn rejects_whitespace_inside() {
        let err = Email::try_from("al ice@example.com".to_string()).unwrap_err();
        assert!(err.message().contains("whitespace"));
    }

    #[test]
    fn rejects_leading_dot_in_domain() {
        let err = Email::try_from("alice@.example.com".to_string()).unwrap_err();
        assert!(err.message().contains("domain labels"));
    }

    #[test]
    fn rejects_trailing_dot_in_domain() {
        let err = Email::try_from("alice@example.".to_string()).unwrap_err();
        assert!(err.message().contains("domain labels"));
    }

    #[test]
    fn rejects_consecutive_dots_in_domain() {
        let err = Email::try_from("alice@example..com".to_string()).unwrap_err();
        assert!(err.message().contains("domain labels"));
    }

    #[test]
    fn rejects_too_long() {
        let long = format!("{}@example.com", "a".repeat(MAX_EMAIL_LENGTH));
        let err = Email::try_from(long).unwrap_err();
        assert!(err.message().contains("cannot exceed"));
    }
}
