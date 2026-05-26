use super::{
    Memory, USER_PRINCIPAL_NAME_MEMORY_ID, USER_PROFILES_MEMORY_ID,
    USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID, USER_PROFILE_VERIFIED_EMAIL_INDEX_MEMORY_ID,
    USER_STATS_MEMORY_ID,
};
use crate::data::{
    memory::{get_memory, USER_PROFILE_ID_PRINCIPAL_INDEX_MEMORY_ID},
    UserId, UserProfile, UserStatsData, VerifiedEmailKey,
};
use candid::Principal;
use ic_stable_structures::{BTreeMap, BTreeSet, StableCell};

pub type UserProfileMemory = BTreeMap<UserId, UserProfile, Memory>;
pub type UserProfilePrincipalIndexMemory = BTreeMap<Principal, UserId, Memory>;
pub type UserProfileIdPrincipalIndexMemory = BTreeSet<(UserId, Principal), Memory>;
pub type UserPrincipalNameMemory = BTreeMap<(UserId, Principal), String, Memory>;
pub type UserProfileVerifiedEmailIndexMemory = BTreeMap<VerifiedEmailKey, UserId, Memory>;
pub type UserStatsMemory = StableCell<UserStatsData, Memory>;

pub fn init_user_profiles() -> UserProfileMemory {
    UserProfileMemory::init(get_user_profiles_memory())
}

pub fn init_user_profile_principal_index() -> UserProfilePrincipalIndexMemory {
    UserProfilePrincipalIndexMemory::init(get_user_profile_principal_index_memory())
}

pub fn init_user_profile_id_principal_index() -> UserProfileIdPrincipalIndexMemory {
    UserProfileIdPrincipalIndexMemory::init(get_user_profile_id_principal_index_memory())
}

pub fn init_user_principal_names() -> UserPrincipalNameMemory {
    UserPrincipalNameMemory::init(get_user_principal_name_memory())
}

pub fn init_user_profile_verified_email_index() -> UserProfileVerifiedEmailIndexMemory {
    UserProfileVerifiedEmailIndexMemory::init(get_user_profile_verified_email_index_memory())
}

pub fn init_user_stats() -> UserStatsMemory {
    UserStatsMemory::init(get_user_stats_memory(), UserStatsData::default())
}

fn get_user_profiles_memory() -> Memory {
    get_memory(USER_PROFILES_MEMORY_ID)
}

fn get_user_profile_principal_index_memory() -> Memory {
    get_memory(USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID)
}

fn get_user_profile_id_principal_index_memory() -> Memory {
    get_memory(USER_PROFILE_ID_PRINCIPAL_INDEX_MEMORY_ID)
}

fn get_user_principal_name_memory() -> Memory {
    get_memory(USER_PRINCIPAL_NAME_MEMORY_ID)
}

fn get_user_profile_verified_email_index_memory() -> Memory {
    get_memory(USER_PROFILE_VERIFIED_EMAIL_INDEX_MEMORY_ID)
}

fn get_user_stats_memory() -> Memory {
    get_memory(USER_STATS_MEMORY_ID)
}
