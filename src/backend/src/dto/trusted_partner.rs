use candid::CandidType;
use serde::Deserialize;

pub type ListTrustedPartnersResponse = Vec<TrustedPartner>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CreateTrustedPartnerRequest {
    pub name: String,
    pub principal_id: String,
}

pub type CreateTrustedPartnerResponse = TrustedPartner;

#[derive(Debug, Clone, CandidType)]
pub struct TrustedPartner {
    pub id: String,
    pub name: String,
    pub principal_id: String,
}
