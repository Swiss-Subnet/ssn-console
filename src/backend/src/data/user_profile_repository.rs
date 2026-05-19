use super::{
    memory::{
        init_user_profile_principal_index, init_user_profiles, init_user_stats, UserProfileMemory,
        UserProfilePrincipalIndexMemory, UserStatsMemory,
    },
    LinkedPrincipal, UserProfile, UserStatsData, VerifiedEmailKey,
};
use crate::data::memory::{
    init_user_principal_names, init_user_profile_id_principal_index,
    init_user_profile_verified_email_index, UserPrincipalNameMemory,
    UserProfileIdPrincipalIndexMemory, UserProfileVerifiedEmailIndexMemory,
};
use crate::validation::Email;
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid, MAX_PRINCIPAL, MIN_PRINCIPAL};
use std::cell::RefCell;
use std::collections::BTreeMap;

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

pub fn get_user_id_by_verified_email(email: &Email) -> Option<Uuid> {
    let key = VerifiedEmailKey::from(email.clone());
    with_state(|s| s.verified_email_index.get(&key))
}

pub fn claim_verified_email(user_id: Uuid, email: Email) -> ApiResult {
    let key = VerifiedEmailKey::from(email);
    mutate_state(|s| match s.verified_email_index.get(&key) {
        Some(existing) if existing == user_id => Ok(()),
        Some(_) => Err(ApiError::client_error(
            "Email is already verified on another account.".to_string(),
        )),
        None => {
            s.verified_email_index.insert(key, user_id);
            Ok(())
        }
    })
}

// Silent no-op when the entry is owned by another user: the caller's
// view is stale and we must not clobber someone else's claim. Accepts
// a raw string so callers don't have to construct the internal key.
pub fn release_verified_email(user_id: Uuid, raw_email: &str) {
    let Some(key) = VerifiedEmailKey::from_legacy_storage_unchecked(raw_email) else {
        return;
    };
    mutate_state(|s| {
        if s.verified_email_index.get(&key) == Some(user_id) {
            s.verified_email_index.remove(&key);
        }
    });
}

// Pre-uniqueness data may have multiple verified rows claiming the same
// address. Index only addresses with exactly one claimant; for any
// collided address, drop every affected user's `email_verified` flag
// so the profile flag and the index stay consistent — affected users
// must re-verify to re-establish the claim under the going-forward
// uniqueness rule.
pub fn migrate_verified_email_index() {
    mutate_state(|s| {
        let mut claimants: BTreeMap<VerifiedEmailKey, Vec<Uuid>> = BTreeMap::new();

        for (user_id, profile) in s.profiles.iter().map(|e| e.into_pair()) {
            if !profile.email_verified {
                continue;
            }
            let Some(raw) = profile.email else { continue };
            let Some(key) = VerifiedEmailKey::from_legacy_storage_unchecked(&raw) else {
                continue;
            };
            claimants.entry(key).or_default().push(user_id);
        }

        let mut indexed: u32 = 0;
        let mut collisions: u32 = 0;
        let mut users_reset: u32 = 0;
        for (key, users) in claimants {
            if users.len() == 1 {
                s.verified_email_index.insert(key, users[0]);
                indexed += 1;
            } else {
                collisions += 1;
                for user_id in users {
                    if let Some(mut profile) = s.profiles.get(&user_id) {
                        profile.email_verified = false;
                        s.profiles.insert(user_id, profile);
                        users_reset += 1;
                    }
                }
            }
        }

        ic_cdk::println!(
            "migrate_verified_email_index: indexed={indexed} collided_addresses={collisions} users_reset={users_reset}"
        );
    });
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
    verified_email_index: UserProfileVerifiedEmailIndexMemory,
    stats: UserStatsMemory,
}

impl Default for UserProfileState {
    fn default() -> Self {
        Self {
            profiles: init_user_profiles(),
            principal_index: init_user_profile_principal_index(),
            id_principal_index: init_user_profile_id_principal_index(),
            principal_names: init_user_principal_names(),
            verified_email_index: init_user_profile_verified_email_index(),
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

    fn lookup_index(key: &VerifiedEmailKey) -> Option<Uuid> {
        with_state(|s| s.verified_email_index.get(key))
    }

    fn key(s: &str) -> VerifiedEmailKey {
        VerifiedEmailKey::from_legacy_storage_unchecked(s).unwrap()
    }

    fn email(s: &str) -> Email {
        Email::try_from(s.to_string()).unwrap()
    }

    #[test]
    fn claim_verified_email_records_owner() {
        let user_id = seed_user(principal(100));

        claim_verified_email(user_id, email("claim-records@example.com")).unwrap();

        assert_eq!(
            lookup_index(&key("claim-records@example.com")),
            Some(user_id)
        );
    }

    #[test]
    fn claim_verified_email_is_idempotent_for_same_user() {
        let user_id = seed_user(principal(101));

        claim_verified_email(user_id, email("claim-idempotent@example.com")).unwrap();
        claim_verified_email(user_id, email("claim-idempotent@example.com")).unwrap();

        assert_eq!(
            lookup_index(&key("claim-idempotent@example.com")),
            Some(user_id)
        );
    }

    #[test]
    fn claim_verified_email_refuses_other_owner() {
        let user_a = seed_user(principal(102));
        let user_b = seed_user(principal(103));

        claim_verified_email(user_a, email("claim-conflict@example.com")).unwrap();
        let err = claim_verified_email(user_b, email("claim-conflict@example.com")).unwrap_err();
        assert_eq!(
            err.message(),
            "Email is already verified on another account."
        );
        assert_eq!(
            lookup_index(&key("claim-conflict@example.com")),
            Some(user_a)
        );
    }

    #[test]
    fn release_verified_email_clears_own_claim() {
        let user_id = seed_user(principal(104));
        claim_verified_email(user_id, email("release-own@example.com")).unwrap();

        release_verified_email(user_id, "release-own@example.com");

        assert_eq!(lookup_index(&key("release-own@example.com")), None);
    }

    #[test]
    fn release_verified_email_ignores_other_owner() {
        let user_a = seed_user(principal(105));
        let user_b = seed_user(principal(106));
        claim_verified_email(user_a, email("release-other@example.com")).unwrap();

        release_verified_email(user_b, "release-other@example.com");

        assert_eq!(
            lookup_index(&key("release-other@example.com")),
            Some(user_a)
        );
    }

    #[test]
    fn release_verified_email_normalizes_raw_input() {
        let user_id = seed_user(principal(107));
        claim_verified_email(user_id, email("Release-Normalize@Example.COM")).unwrap();

        release_verified_email(user_id, "  Release-Normalize@Example.COM  ");

        assert_eq!(lookup_index(&key("release-normalize@example.com")), None);
    }

    // Bypasses claim_verified_email so we can synthesize the pre-migration
    // state of two profiles holding the same verified address.
    fn seed_verified_profile_directly(p: Principal, email: &str) -> Uuid {
        create_user_profile(
            p,
            UserProfile {
                email: Some(email.to_string()),
                email_verified: true,
                ..UserProfile::default()
            },
        )
    }

    #[test]
    fn migrate_indexes_unique_verified_emails() {
        let user_id = seed_verified_profile_directly(principal(110), "Migrate-Unique@Example.COM");

        migrate_verified_email_index();

        assert_eq!(
            lookup_index(&key("migrate-unique@example.com")),
            Some(user_id)
        );
        assert!(
            get_user_profile_by_user_id(&user_id)
                .unwrap()
                .email_verified
        );
    }

    #[test]
    fn migrate_drops_collided_verified_emails() {
        let a = seed_verified_profile_directly(principal(111), "dup@example.com");
        let b = seed_verified_profile_directly(principal(112), "dup@example.com");
        let unique =
            seed_verified_profile_directly(principal(113), "unique-among-dups@example.com");

        migrate_verified_email_index();

        assert_eq!(lookup_index(&key("dup@example.com")), None);
        assert!(!get_user_profile_by_user_id(&a).unwrap().email_verified);
        assert!(!get_user_profile_by_user_id(&b).unwrap().email_verified);
        assert_eq!(
            lookup_index(&key("unique-among-dups@example.com")),
            Some(unique)
        );
        assert!(get_user_profile_by_user_id(&unique).unwrap().email_verified);
    }

    #[test]
    fn migrate_drops_three_way_collisions_entirely() {
        let a = seed_verified_profile_directly(principal(114), "triple@example.com");
        let b = seed_verified_profile_directly(principal(115), "triple@example.com");
        let c = seed_verified_profile_directly(principal(116), "triple@example.com");

        migrate_verified_email_index();

        assert_eq!(lookup_index(&key("triple@example.com")), None);
        for user_id in [a, b, c] {
            assert!(
                !get_user_profile_by_user_id(&user_id)
                    .unwrap()
                    .email_verified
            );
        }
    }

    #[test]
    fn get_user_id_by_verified_email_returns_owner_after_claim() {
        let user_id = seed_user(principal(120));
        claim_verified_email(user_id, email("lookup-hit@example.com")).unwrap();

        let found = get_user_id_by_verified_email(&email("lookup-hit@example.com"));
        assert_eq!(found, Some(user_id));
    }

    #[test]
    fn get_user_id_by_verified_email_normalizes_input() {
        let user_id = seed_user(principal(121));
        claim_verified_email(user_id, email("Lookup-Normalize@Example.COM")).unwrap();

        let found = get_user_id_by_verified_email(&email("  lookup-normalize@example.com  "));
        assert_eq!(found, Some(user_id));
    }

    #[test]
    fn get_user_id_by_verified_email_returns_none_when_unclaimed() {
        assert_eq!(
            get_user_id_by_verified_email(&email("nobody-has-claimed@example.com")),
            None
        );
    }

    #[test]
    fn get_user_id_by_verified_email_returns_none_after_release() {
        let user_id = seed_user(principal(122));
        claim_verified_email(user_id, email("lookup-release@example.com")).unwrap();
        release_verified_email(user_id, "lookup-release@example.com");

        assert_eq!(
            get_user_id_by_verified_email(&email("lookup-release@example.com")),
            None
        );
    }

    #[test]
    fn migrate_skips_unverified_emails() {
        let _user_id = create_user_profile(
            principal(117),
            UserProfile {
                email: Some("unverified@example.com".to_string()),
                email_verified: false,
                ..UserProfile::default()
            },
        );

        migrate_verified_email_index();

        assert_eq!(lookup_index(&key("unverified@example.com")), None);
    }
}
