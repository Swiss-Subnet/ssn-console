use super::{
    memory::{
        init_user_profile_principal_index, init_user_profiles, UserProfileMemory,
        UserProfilePrincipalIndexMemory,
    },
    UserProfile, Uuid,
};
use candid::Principal;
use std::cell::RefCell;

pub fn list_user_profiles() -> Vec<(Uuid, UserProfile)> {
    with_state(|s| s.profiles.iter().map(|e| e.into_pair()).collect())
}

pub fn get_user_profile_by_principal(principal: &Principal) -> Option<(Uuid, UserProfile)> {
    get_user_id_by_principal(principal).and_then(|user_id| {
        get_user_profile_by_user_id(&user_id).map(|user_profile| (user_id, user_profile))
    })
}

pub fn get_user_profile_by_user_id(user_id: &Uuid) -> Option<UserProfile> {
    with_state(|s| s.profiles.get(user_id))
}

pub fn get_user_id_by_principal(principal: &Principal) -> Option<Uuid> {
    with_state(|s| s.principal_index.get(principal))
}

pub fn create_user_profile(calling_principal: Principal, user_profile: UserProfile) -> Uuid {
    let user_id = Uuid::new();

    mutate_state(|s| {
        s.profiles.insert(user_id, user_profile);
        s.principal_index.insert(calling_principal, user_id);
    });

    user_id
}

pub fn update_user_profile(user_id: Uuid, user_profile: UserProfile) -> Result<(), String> {
    mutate_state(|s| {
        if !s.profiles.contains_key(&user_id) {
            return Err(format!("User profile with ID {} does not exist.", user_id));
        }

        s.profiles.insert(user_id, user_profile);

        Ok(())
    })
}

struct UserProfileState {
    profiles: UserProfileMemory,
    principal_index: UserProfilePrincipalIndexMemory,
}

impl Default for UserProfileState {
    fn default() -> Self {
        Self {
            profiles: init_user_profiles(),
            principal_index: init_user_profile_principal_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<UserProfileState> = RefCell::new(UserProfileState::default());
}

fn with_state<R>(f: impl FnOnce(&UserProfileState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut UserProfileState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
