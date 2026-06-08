use super::{
    memory::{
        init_organization_user_index, init_organizations, init_user_organization_index,
        OrganizationMemory, OrganizationUserIndexMemory, UserOrganizationIndexMemory,
    },
    OrgId, Organization, UserId,
};
use canister_utils::{ApiError, ApiResult};
use std::cell::RefCell;
use std::ops::Bound::{Excluded, Included};

pub fn create_org(user_id: UserId, org: Organization) -> OrgId {
    let org_id = OrgId::new();

    mutate_state(|s| {
        s.organizations.insert(org_id, org);
        s.organization_user_index.insert((org_id, user_id));
        s.user_organization_index.insert((user_id, org_id));
    });

    org_id
}

pub fn add_default_org(user_id: UserId) -> OrgId {
    create_org(
        user_id,
        Organization {
            name: "Default Organization".to_string(),
        },
    )
}

pub fn get_org(org_id: OrgId) -> Option<Organization> {
    with_state(|s| s.organizations.get(&org_id))
}

pub fn update_org(org_id: OrgId, org: Organization) -> ApiResult {
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
pub fn delete_org(org_id: OrgId) -> ApiResult {
    mutate_state(|s| {
        if s.organizations.remove(&org_id).is_none() {
            return Err(ApiError::client_error(format!(
                "Organization with id {org_id} does not exist."
            )));
        }

        let org_users = s
            .organization_user_index
            .range((org_id, UserId::MIN)..=(org_id, UserId::MAX))
            .collect::<Vec<_>>();

        for (oid, uid) in org_users {
            s.organization_user_index.remove(&(oid, uid));
            s.user_organization_index.remove(&(uid, oid));
        }

        Ok(())
    })
}

pub fn has_at_least_n_user_orgs(user_id: UserId, n: usize) -> bool {
    with_state(|s| {
        s.user_organization_index
            .range((user_id, OrgId::MIN)..=(user_id, OrgId::MAX))
            .take(n)
            .count()
            >= n
    })
}

pub fn list_user_orgs(user_id: UserId) -> Vec<(OrgId, Organization)> {
    with_state(|s| {
        s.user_organization_index
            .range((user_id, OrgId::MIN)..=(user_id, OrgId::MAX))
            .filter_map(|(_, org_id)| s.organizations.get(&org_id).map(|org| (org_id, org)))
            .collect()
    })
}

// Staff-side full scan over every org, ordered by id, starting strictly after
// the `after` cursor (or from the beginning when None) and returning up to
// `limit`. The cursor is the last id returned; pass it back for the next page.
pub fn list_all_orgs(after: Option<OrgId>, limit: usize) -> Vec<(OrgId, Organization)> {
    with_state(|s| {
        let start = match after {
            Some(cursor) => Excluded(cursor),
            None => Included(OrgId::MIN),
        };
        s.organizations
            .range((start, Included(OrgId::MAX)))
            .take(limit)
            .map(|e| e.into_pair())
            .collect()
    })
}

pub fn list_org_users(org_id: OrgId) -> Vec<UserId> {
    with_state(|s| {
        s.organization_user_index
            .range((org_id, UserId::MIN)..=(org_id, UserId::MAX))
            .map(|(_, user_id)| user_id)
            .collect::<Vec<_>>()
    })
}

pub fn add_user_to_org(user_id: UserId, org_id: OrgId) {
    mutate_state(|s| {
        s.organization_user_index.insert((org_id, user_id));
        s.user_organization_index.insert((user_id, org_id));
    });
}

// Predicate-only membership check. Authorization-grade checks must go
// through `service::access_control_service::OrgAuth` so that a successful
// check produces a capability token rather than a bare bool. This function
// is reserved for cases that are not themselves authorization decisions
// (e.g. "is the invite target already a member" idempotency checks).
pub fn is_user_in_org(user_id: UserId, org_id: OrgId) -> bool {
    with_state(|s| s.organization_user_index.contains(&(org_id, user_id)))
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![
            ("organizations", s.organizations.len()),
            ("organization_user_index", s.organization_user_index.len()),
            ("user_organization_index", s.user_organization_index.len()),
        ]
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

#[cfg(test)]
mod tests {
    use super::*;

    fn seed(name: &str) -> OrgId {
        let user = UserId::new();
        create_org(
            user,
            Organization {
                name: name.to_string(),
            },
        )
    }

    // Walk every page from the given cursor, collecting ids, so assertions
    // hold regardless of orgs seeded by other tests sharing the global STATE.
    fn drain_from(after: Option<OrgId>, page: usize) -> Vec<OrgId> {
        let mut out = Vec::new();
        let mut cursor = after;
        loop {
            let chunk = list_all_orgs(cursor, page);
            if chunk.is_empty() {
                break;
            }
            cursor = Some(chunk.last().unwrap().0);
            out.extend(chunk.into_iter().map(|(id, _)| id));
        }
        out
    }

    #[test]
    fn list_all_orgs_returns_seeded_orgs_in_id_order() {
        let mut seeded: Vec<OrgId> = (0..5).map(|i| seed(&format!("order-{i}"))).collect();
        seeded.sort();

        let all = drain_from(None, 2);
        let got: Vec<OrgId> = all.into_iter().filter(|id| seeded.contains(id)).collect();
        assert_eq!(got, seeded);
    }

    #[test]
    fn list_all_orgs_honors_limit() {
        for i in 0..4 {
            seed(&format!("limit-{i}"));
        }
        assert_eq!(list_all_orgs(None, 2).len(), 2);
    }

    #[test]
    fn list_all_orgs_cursor_excludes_itself() {
        let mut seeded: Vec<OrgId> = (0..3).map(|i| seed(&format!("cursor-{i}"))).collect();
        seeded.sort();

        let after_first = drain_from(Some(seeded[0]), 10);
        assert!(!after_first.contains(&seeded[0]));
        assert!(after_first.contains(&seeded[1]));
    }
}
