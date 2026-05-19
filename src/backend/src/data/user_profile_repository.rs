use super::{
    memory::{
        init_user_profile_principal_index, init_user_profiles, init_user_stats, UserProfileMemory,
        UserProfilePrincipalIndexMemory, UserStatsMemory,
    },
    LinkedPrincipal, UserProfile, UserStatsData,
};
use crate::data::memory::{
    init_user_principal_names, init_user_profile_id_principal_index, UserPrincipalNameMemory,
    UserProfileIdPrincipalIndexMemory,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid, MAX_PRINCIPAL, MIN_PRINCIPAL};
use std::cell::RefCell;

pub fn list_user_profiles() -> Vec<(Uuid, UserProfile, Vec<Principal>)> {
    with_state(|s| {
        s.profiles
            .iter()
            .map(|e| {
                let (id, profile) = e.into_pair();
                let principals = get_principals_by_user_id(id);

                (id, profile.clone(), principals)
            })
            .collect()
    })
}

pub fn get_user_profile_by_principal(principal: &Principal) -> Option<(Uuid, UserProfile)> {
    get_user_id_by_principal(principal).and_then(|user_id| {
        get_user_profile_by_user_id(&user_id).map(|user_profile| (user_id, user_profile))
    })
}

pub fn get_user_profile_by_user_id(user_id: &Uuid) -> Option<UserProfile> {
    with_state(|s| s.profiles.get(user_id))
}

pub fn assert_user_id_by_principal(principal: &Principal) -> ApiResult<Uuid> {
    get_user_id_by_principal(principal).ok_or_else(|| {
        ApiError::client_error(format!(
            "User profile for principal {principal} does not exist."
        ))
    })
}

pub fn get_user_id_by_principal(principal: &Principal) -> Option<Uuid> {
    with_state(|s| s.principal_index.get(principal))
}

pub fn get_principals_by_user_id(user_id: Uuid) -> Vec<Principal> {
    with_state(|s| {
        s.id_principal_index
            .range((user_id, MIN_PRINCIPAL)..=(user_id, MAX_PRINCIPAL))
            .map(|(_, principal)| principal)
            .collect()
    })
}

pub fn create_user_profile(caller: Principal, user_profile: UserProfile) -> Uuid {
    let id = Uuid::new();

    mutate_state(|s| {
        s.profiles.insert(id, user_profile);
        s.principal_index.insert(caller, id);
        s.id_principal_index.insert((id, caller));
    });

    id
}

/// Links an additional principal to an existing user.
///
/// Returns a generic error on any failure (missing user, principal already
/// claimed) so this cannot be used as an existence oracle. Caller must have
/// proven control of `principal`; that gate lives in the service layer.
pub fn link_principal_to_user(user_id: Uuid, principal: Principal) -> ApiResult {
    mutate_state(|s| {
        if !s.profiles.contains_key(&user_id) {
            return Err(ApiError::client_error(
                "Principal cannot be linked.".to_string(),
            ));
        }
        if s.principal_index.contains_key(&principal) {
            return Err(ApiError::client_error(
                "Principal cannot be linked.".to_string(),
            ));
        }
        s.principal_index.insert(principal, user_id);
        s.id_principal_index.insert((user_id, principal));
        Ok(())
    })
}

/// Unlinks a principal from a user. Refuses to remove a user's last
/// principal — that would orphan the account; deletion is a separate flow.
pub fn unlink_principal_from_user(user_id: Uuid, principal: Principal) -> ApiResult {
    mutate_state(|s| {
        if s.principal_index.get(&principal) != Some(user_id) {
            return Err(ApiError::client_error(
                "Principal cannot be unlinked.".to_string(),
            ));
        }

        let principal_count = s
            .id_principal_index
            .range((user_id, MIN_PRINCIPAL)..=(user_id, MAX_PRINCIPAL))
            .count();
        if principal_count <= 1 {
            return Err(ApiError::client_error(
                "Principal cannot be unlinked.".to_string(),
            ));
        }

        s.principal_index.remove(&principal);
        s.id_principal_index.remove(&(user_id, principal));
        s.principal_names.remove(&(user_id, principal));
        Ok(())
    })
}

pub fn get_principals_with_names_by_user_id(user_id: Uuid) -> Vec<LinkedPrincipal> {
    with_state(|s| {
        s.id_principal_index
            .range((user_id, MIN_PRINCIPAL)..=(user_id, MAX_PRINCIPAL))
            .map(|(_, principal)| LinkedPrincipal {
                principal,
                name: s.principal_names.get(&(user_id, principal)),
            })
            .collect()
    })
}

/// Sets or clears the display name a user has assigned to one of their own
/// linked principals. `name = None` clears the entry. Caller-supplied input
/// must be validated by `validation::validate_optional_principal_name` first.
pub fn set_principal_name(user_id: Uuid, principal: Principal, name: Option<String>) -> ApiResult {
    mutate_state(|s| {
        if !s.id_principal_index.contains(&(user_id, principal)) {
            return Err(ApiError::client_error(
                "Principal cannot be renamed.".to_string(),
            ));
        }
        match name {
            Some(value) => {
                s.principal_names.insert((user_id, principal), value);
            }
            None => {
                s.principal_names.remove(&(user_id, principal));
            }
        }
        Ok(())
    })
}

pub fn update_user_profile(user_id: Uuid, user_profile: UserProfile) -> ApiResult {
    mutate_state(|s| {
        if !s.profiles.contains_key(&user_id) {
            return Err(ApiError::client_error(format!(
                "User profile with ID {} does not exist.",
                user_id
            )));
        }

        s.profiles.insert(user_id, user_profile);

        Ok(())
    })
}

pub fn get_user_stats() -> UserStatsData {
    with_state(|s| s.stats.get().clone())
}

pub fn increment_user_count(is_active: bool) {
    mutate_state(|s| {
        let mut stats = s.stats.get().clone();
        stats.total += 1;
        if is_active {
            stats.active += 1;
        } else {
            stats.inactive += 1;
        }
        s.stats.set(stats);
    });
}

pub fn update_user_status_count(was_active: bool, is_active: bool) {
    if was_active == is_active {
        return;
    }
    mutate_state(|s| {
        let mut stats = s.stats.get().clone();
        if is_active {
            stats.active += 1;
            stats.inactive -= 1;
        } else {
            stats.active -= 1;
            stats.inactive += 1;
        }
        s.stats.set(stats);
    });
}

struct UserProfileState {
    profiles: UserProfileMemory,
    principal_index: UserProfilePrincipalIndexMemory,
    id_principal_index: UserProfileIdPrincipalIndexMemory,
    principal_names: UserPrincipalNameMemory,
    stats: UserStatsMemory,
}

impl Default for UserProfileState {
    fn default() -> Self {
        Self {
            profiles: init_user_profiles(),
            principal_index: init_user_profile_principal_index(),
            id_principal_index: init_user_profile_id_principal_index(),
            principal_names: init_user_principal_names(),
            stats: init_user_stats(),
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

#[cfg(feature = "canbench-rs")]
mod benches {
    use super::{
        create_user_profile, get_principals_with_names_by_user_id, link_principal_to_user,
        set_principal_name,
    };
    use crate::data::UserProfile;
    use candid::Principal;
    use canbench_rs::{bench, bench_fn, BenchResult};

    fn principal(i: u32) -> Principal {
        let mut bytes = [0u8; 29];
        bytes[25..29].copy_from_slice(&i.to_be_bytes());
        Principal::from_slice(&bytes)
    }

    fn bench_get_principals_with_names_by_user_id(num_principals: u32) -> BenchResult {
        let user_id = create_user_profile(principal(0), UserProfile::default());
        for i in 1..num_principals {
            link_principal_to_user(user_id, principal(i)).unwrap();
        }
        // Name every other principal so the secondary lookup hits a mix of
        // present and absent entries — closer to real load than all-named.
        for i in (0..num_principals).step_by(2) {
            set_principal_name(user_id, principal(i), Some(format!("device-{i}"))).unwrap();
        }

        bench_fn(|| {
            get_principals_with_names_by_user_id(user_id);
        })
    }

    #[bench(raw)]
    pub fn bench_get_principals_with_names_by_user_id_10() -> BenchResult {
        bench_get_principals_with_names_by_user_id(10)
    }

    #[bench(raw)]
    pub fn bench_get_principals_with_names_by_user_id_100() -> BenchResult {
        bench_get_principals_with_names_by_user_id(100)
    }

    #[bench(raw)]
    pub fn bench_get_principals_with_names_by_user_id_1000() -> BenchResult {
        bench_get_principals_with_names_by_user_id(1000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn principal(byte: u8) -> Principal {
        let mut bytes = [0u8; 29];
        bytes[28] = byte;
        Principal::from_slice(&bytes)
    }

    fn seed_user(initial_principal: Principal) -> Uuid {
        create_user_profile(initial_principal, UserProfile::default())
    }

    #[test]
    fn link_principal_attaches_to_user() {
        let p1 = principal(10);
        let p2 = principal(11);
        let user_id = seed_user(p1);

        link_principal_to_user(user_id, p2).unwrap();

        assert_eq!(get_user_id_by_principal(&p1), Some(user_id));
        assert_eq!(get_user_id_by_principal(&p2), Some(user_id));
        let principals = get_principals_by_user_id(user_id);
        assert!(principals.contains(&p1));
        assert!(principals.contains(&p2));
    }

    #[test]
    fn link_principal_rejects_already_claimed() {
        let p1 = principal(20);
        let p2 = principal(21);
        let user_a = seed_user(p1);
        let user_b = seed_user(p2);

        let err = link_principal_to_user(user_b, p1).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be linked.");
        assert_eq!(get_user_id_by_principal(&p1), Some(user_a));
    }

    #[test]
    fn link_principal_rejects_relinking_own_principal() {
        let p1 = principal(30);
        let user_id = seed_user(p1);

        let err = link_principal_to_user(user_id, p1).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be linked.");
    }

    #[test]
    fn link_principal_rejects_unknown_user() {
        let p1 = principal(40);
        let unknown_user = Uuid::new();

        let err = link_principal_to_user(unknown_user, p1).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be linked.");
        assert_eq!(get_user_id_by_principal(&p1), None);
    }

    #[test]
    fn unlink_principal_removes_link() {
        let p1 = principal(50);
        let p2 = principal(51);
        let user_id = seed_user(p1);
        link_principal_to_user(user_id, p2).unwrap();

        unlink_principal_from_user(user_id, p2).unwrap();

        assert_eq!(get_user_id_by_principal(&p2), None);
        assert_eq!(get_user_id_by_principal(&p1), Some(user_id));
        assert_eq!(get_principals_by_user_id(user_id), vec![p1]);
    }

    #[test]
    fn unlink_principal_refuses_last_principal() {
        let p1 = principal(60);
        let user_id = seed_user(p1);

        let err = unlink_principal_from_user(user_id, p1).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be unlinked.");
        assert_eq!(get_user_id_by_principal(&p1), Some(user_id));
    }

    #[test]
    fn unlink_principal_rejects_principal_not_owned_by_user() {
        let p1 = principal(70);
        let p2 = principal(71);
        let user_a = seed_user(p1);
        let user_b = seed_user(p2);

        let err = unlink_principal_from_user(user_a, p2).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be unlinked.");
        assert_eq!(get_user_id_by_principal(&p2), Some(user_b));
    }

    #[test]
    fn unlink_principal_rejects_unlinked_principal() {
        let p1 = principal(80);
        let p2 = principal(81);
        let user_id = seed_user(p1);

        let err = unlink_principal_from_user(user_id, p2).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be unlinked.");
    }

    fn name_for(user_id: Uuid, principal: Principal) -> Option<String> {
        with_state(|s| s.principal_names.get(&(user_id, principal)))
    }

    #[test]
    fn set_principal_name_stores_and_lists_name() {
        let p1 = principal(90);
        let p2 = principal(91);
        let user_id = seed_user(p1);
        link_principal_to_user(user_id, p2).unwrap();

        set_principal_name(user_id, p2, Some("Hardware wallet".to_string())).unwrap();

        let listed = get_principals_with_names_by_user_id(user_id);
        assert!(listed
            .iter()
            .any(|e| e.principal == p2 && e.name.as_deref() == Some("Hardware wallet")));
        assert!(listed.iter().any(|e| e.principal == p1 && e.name.is_none()));
    }

    #[test]
    fn set_principal_name_with_none_clears() {
        let p1 = principal(100);
        let p2 = principal(101);
        let user_id = seed_user(p1);
        link_principal_to_user(user_id, p2).unwrap();
        set_principal_name(user_id, p2, Some("Laptop".to_string())).unwrap();

        set_principal_name(user_id, p2, None).unwrap();

        assert_eq!(name_for(user_id, p2), None);
    }

    #[test]
    fn set_principal_name_rejects_principal_not_owned_by_user() {
        let p1 = principal(110);
        let p2 = principal(111);
        let user_a = seed_user(p1);
        seed_user(p2);

        let err = set_principal_name(user_a, p2, Some("Stranger".to_string())).unwrap_err();
        assert_eq!(err.message(), "Principal cannot be renamed.");
        assert_eq!(name_for(user_a, p2), None);
    }

    #[test]
    fn set_principal_name_by_sibling_principal_succeeds() {
        // Ownership is by user, not by caller principal: P1 setting P2's name
        // is the same operation as P2 setting it. The controller resolves the
        // caller's user_id and passes it in here.
        let p1 = principal(120);
        let p2 = principal(121);
        let user_id = seed_user(p1);
        link_principal_to_user(user_id, p2).unwrap();

        set_principal_name(user_id, p2, Some("My phone".to_string())).unwrap();
        set_principal_name(user_id, p1, Some("My laptop".to_string())).unwrap();

        assert_eq!(name_for(user_id, p1), Some("My laptop".to_string()));
        assert_eq!(name_for(user_id, p2), Some("My phone".to_string()));
    }

    #[test]
    fn unlink_principal_clears_its_name() {
        let p1 = principal(130);
        let p2 = principal(131);
        let user_id = seed_user(p1);
        link_principal_to_user(user_id, p2).unwrap();
        set_principal_name(user_id, p2, Some("Old device".to_string())).unwrap();

        unlink_principal_from_user(user_id, p2).unwrap();

        // After unlink, the principal is no longer in the listing — its name
        // entry must also be gone, so re-linking later starts unnamed.
        assert!(!get_principals_with_names_by_user_id(user_id)
            .iter()
            .any(|e| e.principal == p2));
        link_principal_to_user(user_id, p2).unwrap();
        assert_eq!(name_for(user_id, p2), None);
    }
}
