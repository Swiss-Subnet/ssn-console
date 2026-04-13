use super::{
    memory::{
        init_organization_user_index, init_organizations, init_user_organization_index,
        OrganizationMemory, OrganizationUserIndexMemory, UserOrganizationIndexMemory,
    },
    Organization,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

pub fn create_org(user_id: Uuid, org: Organization) -> Uuid {
    let org_id = Uuid::new();

    mutate_state(|s| {
        s.organizations.insert(org_id, org);
        s.organization_user_index.insert((org_id, user_id));
        s.user_organization_index.insert((user_id, org_id));
    });

    org_id
}

pub fn add_default_org(user_id: Uuid) -> Uuid {
    create_org(
        user_id,
        Organization {
            name: "Default Organization".to_string(),
        },
    )
}

pub fn get_org(org_id: Uuid) -> Option<Organization> {
    with_state(|s| s.organizations.get(&org_id))
}

pub fn update_org(org_id: Uuid, org: Organization) -> ApiResult {
    mutate_state(|s| {
        if !s.organizations.contains_key(&org_id) {
            return Err(ApiError::client_error(format!(
                "Organization with id {org_id} does not exist."
            )));
        }
        s.organizations.insert(org_id, org);
        Ok(())
    })
}

// Deletes the org record and its user links. The caller (service layer)
// must enforce guards: org has no projects, user has more than one org.
pub fn delete_org(org_id: Uuid) -> ApiResult {
    mutate_state(|s| {
        if s.organizations.remove(&org_id).is_none() {
            return Err(ApiError::client_error(format!(
                "Organization with id {org_id} does not exist."
            )));
        }

        while let Some((oid, uid)) = s
            .organization_user_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .next()
        {
            s.organization_user_index.remove(&(oid, uid));
            s.user_organization_index.remove(&(uid, oid));
        }

        Ok(())
    })
}

pub fn has_at_least_n_user_orgs(user_id: Uuid, n: usize) -> bool {
    with_state(|s| {
        s.user_organization_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .take(n)
            .count()
            >= n
    })
}

pub fn list_user_orgs(user_id: Uuid) -> Vec<(Uuid, Organization)> {
    with_state(|s| {
        s.user_organization_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .filter_map(|(_, org_id)| s.organizations.get(&org_id).map(|org| (org_id, org)))
            .collect()
    })
}

pub fn list_org_users(org_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.organization_user_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .map(|(_, user_id)| user_id)
            .collect::<Vec<_>>()
    })
}

pub fn assert_user_in_org(user_id: Uuid, org_id: Uuid) -> ApiResult {
    with_state(|s| {
        if !s.organization_user_index.contains(&(org_id, user_id)) {
            return Err(ApiError::unauthorized(format!(
                "User with id {user_id} does not belong to org with id {org_id}"
            )));
        }

        Ok(())
    })
}

struct OrganizationState {
    organizations: OrganizationMemory,
    organization_user_index: OrganizationUserIndexMemory,
    user_organization_index: UserOrganizationIndexMemory,
}

impl Default for OrganizationState {
    fn default() -> Self {
        Self {
            organizations: init_organizations(),
            organization_user_index: init_organization_user_index(),
            user_organization_index: init_user_organization_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<OrganizationState> = RefCell::new(OrganizationState::default());
}

fn with_state<R>(f: impl FnOnce(&OrganizationState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut OrganizationState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
