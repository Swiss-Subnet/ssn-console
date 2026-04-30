use candid::{CandidType, Principal};
use serde::Deserialize;

pub type ListUserProfilesResponse = Vec<UserProfile>;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetUserProfilesByPrincipalsRequest {
    pub project_id: String,
    pub principals: Vec<Principal>,
}

#[derive(Debug, Clone, CandidType)]
pub struct GetUserProfilesByPrincipalsResponse {
    pub profiles: Vec<UserProfileByPrincipal>,
}

#[derive(Debug, Clone, CandidType)]
pub struct UserProfileByPrincipal {
    pub subject_principal: Principal,
    pub profile: Option<UserProfileBrief>,
}

#[derive(Debug, Clone, CandidType)]
pub struct UserProfileBrief {
    pub id: String,
    pub email: Option<String>,
    pub email_verified: bool,
}

pub type GetMyUserProfileResponse = Option<UserProfile>;

pub type CreateMyUserProfileResponse = UserProfile;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateMyUserProfileRequest {
    pub email: Option<String>,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct UpdateUserProfileRequest {
    pub user_id: String,
    pub status: Option<UserStatus>,
}

#[derive(Debug, Clone, CandidType)]
pub struct UserProfile {
    pub id: String,
    pub email: Option<String>,
    pub email_verified: bool,
    pub status: UserStatus,
    pub is_admin: bool,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub enum UserStatus {
    Active,
    Inactive,
}

#[derive(Debug, Clone, CandidType)]
pub struct GetUserStatsResponse {
    pub total: u64,
    pub active: u64,
    pub inactive: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}
