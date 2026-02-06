use candid::CandidType;
use serde::Deserialize;

pub type GetLatestTermsAndConditionsResponse = Option<TermsAndConditions>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TermsAndConditions {
    pub id: String,
    pub content: String,
    pub comment: String,
    pub created_at: u64,
    pub has_accepted: bool,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateTermsAndConditionsRequest {
    pub content: String,
    pub comment: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateTermsAndConditionsResponseRequest {
    pub terms_and_conditions_id: String,
    pub response_type: TermsAndConditionsResponseType,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum TermsAndConditionsResponseType {
    Accept,
    Reject,
}
