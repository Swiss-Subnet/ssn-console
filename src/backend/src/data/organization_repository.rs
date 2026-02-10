use super::{
    memory::{
        init_organization_user_index, init_organizations, init_user_organization_index,
        OrganizationMemory, OrganizationUserIndexMemory, UserOrganizationIndexMemory,
    },
    Organization, Uuid,
};
use std::cell::RefCell;

pub fn add_default_org(user_id: Uuid) {
    let org_id = Uuid::new();
    let org = Organization {
        name: "Default Organization".to_string(),
    };

    if list_user_org_ids(user_id).len() > 0 {
        return;
    }

    mutate_state(|s| {
        s.organizations.insert(org_id, org);
        s.organization_user_index.insert((org_id, user_id));
        s.user_organization_index.insert((user_id, org_id));
    })
}

fn list_user_org_ids(user_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.user_organization_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .map(|(_, org_id)| org_id)
            .collect()
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
