use candid::CandidType;
use canister_utils::ApiError;
use serde::Deserialize;

// Machine-readable cause for the token-redemption endpoints (email
// verification, account recovery) so callers branch on a variant instead of
// parsing the message. Scoped to those endpoints; not part of ApiError.
#[derive(Debug, Clone, Copy, CandidType, Deserialize, PartialEq, Eq)]
pub enum RejectionReason {
    Expired,
    Invalid,
    WrongPurpose,
    EmailMismatch,
    ProfileNotFound,
    NoVerifiedAccount,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RejectionError {
    pub message: String,
    // None for failures that predate token logic (e.g. unauthenticated caller).
    pub reason: Option<RejectionReason>,
}

impl RejectionError {
    pub fn new(message: String, reason: RejectionReason) -> Self {
        Self {
            message,
            reason: Some(reason),
        }
    }
}

// Auth guards run before token logic and produce a plain ApiError; carry its
// message through with no reason.
impl From<ApiError> for RejectionError {
    fn from(err: ApiError) -> Self {
        Self {
            message: err.message().to_string(),
            reason: None,
        }
    }
}
