use super::{
    Memory, MEMORY_MANAGER, USER_PROFILES_MEMORY_ID, USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID,
};
use crate::data::{UserProfile, Uuid};
use candid::Principal;
use ic_stable_structures::BTreeMap;

pub type UserProfileMemory = BTreeMap<Uuid, UserProfile, Memory>;
pub type UserProfilePrincipalIndexMemory = BTreeMap<Principal, Uuid, Memory>;

pub fn init_user_profiles() -> UserProfileMemory {
    UserProfileMemory::init(get_user_profiles_memory())
}

pub fn init_user_profile_principal_index() -> UserProfilePrincipalIndexMemory {
    UserProfilePrincipalIndexMemory::init(get_user_profile_principal_index_memory())
}

fn get_user_profiles_memory() -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(USER_PROFILES_MEMORY_ID))
}

fn get_user_profile_principal_index_memory() -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(USER_PROFILE_PRINCIPAL_INDEX_MEMORY_ID))
}
