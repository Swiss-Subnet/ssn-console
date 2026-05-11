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
pub struct ListMyLinkedPrincipalsResponse {
    pub principals: Vec<Principal>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct ListMyPendingLinkCodesRequest {}

#[derive(Debug, Clone, CandidType)]
pub struct PendingLinkCodeDto {
    pub code: String,
    pub expires_at_nanos: u64,
    pub target_principal: Principal,
}

#[derive(Debug, Clone, CandidType)]
pub struct ListMyPendingLinkCodesResponse {
    pub codes: Vec<PendingLinkCodeDto>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeLinkCodeRequest {
    pub code: String,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct RevokeLinkCodeResponse {}
