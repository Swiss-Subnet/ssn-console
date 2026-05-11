use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RegisterLinkCodeRequest {
    pub code: String,
    pub target_principal: Principal,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RegisterLinkCodeResponse {
    pub expires_at_nanos: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct LinkMyPrincipalRequest {
    pub code: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct LinkMyPrincipalResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UnlinkMyPrincipalRequest {
    pub principal: Principal,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UnlinkMyPrincipalResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyLinkedPrincipalsRequest {}

#[derive(Debug, Clone, CandidType)]
pub struct LinkedPrincipalDto {
    pub principal: Principal,
    pub name: Option<String>,
}

#[derive(Debug, Clone, CandidType)]
pub struct ListMyLinkedPrincipalsResponse {
    pub principals: Vec<LinkedPrincipalDto>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct SetMyPrincipalNameRequest {
    pub principal: Principal,
    pub name: Option<String>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct SetMyPrincipalNameResponse {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetMyPendingLinkCodeRequest {}

#[derive(Debug, Clone, CandidType)]
pub struct PendingLinkCodeDto {
    pub code: String,
    pub expires_at_nanos: u64,
    pub target_principal: Principal,
}

#[derive(Debug, Clone, CandidType)]
pub struct GetMyPendingLinkCodeResponse {
    pub code: Option<PendingLinkCodeDto>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeMyLinkCodeRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeMyLinkCodeResponse {}
