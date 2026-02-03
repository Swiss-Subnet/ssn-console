use super::{Memory, USER_PROFILES_MEMORY_ID, USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID, USER_STATS_MEMORY_ID};
use crate::data::{
    memory::{get_memory, USER_PROFILE_ID_PRINCIPAL_INDEX_MEMORY_ID},
    UserProfile, UserStatsData, Uuid,
};
use candid::Principal;
use ic_stable_structures::{BTreeMap, BTreeSet, StableCell};

pub type UserProfileMemory = BTreeMap<Uuid, UserProfile, Memory>;
pub type UserProfilePrincipalIndexMemory = BTreeMap<Principal, Uuid, Memory>;
pub type UserProfileIdPrincipalIndexMemory = BTreeSet<(Uuid, Principal), Memory>;
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

pub fn init_user_stats() -> UserStatsMemory {
    UserStatsMemory::init(get_memory(USER_STATS_MEMORY_ID), UserStatsData::default())
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

fn get_user_stats_memory() -> Memory {
    get_memory(USER_STATS_MEMORY_ID)
}
