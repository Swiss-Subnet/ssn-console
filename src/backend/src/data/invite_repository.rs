use super::{
    memory::{
        init_org_invites, init_organization_invite_index, OrgInviteMemory,
        OrganizationInviteIndexMemory,
    },
    InviteStatus, OrgInvite,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

pub fn create_invite(invite: OrgInvite) -> Uuid {
    let invite_id = Uuid::new();
    mutate_state(|s| {
        s.organization_invite_index
            .insert((invite.org_id, invite_id));
        s.invites.insert(invite_id, invite);
    });
    invite_id
}

pub fn get_invite(invite_id: Uuid) -> Option<OrgInvite> {
    with_state(|s| s.invites.get(&invite_id))
}

pub fn update_invite(invite_id: Uuid, invite: OrgInvite) -> ApiResult {
    mutate_state(|s| {
        if !s.invites.contains_key(&invite_id) {
            return Err(ApiError::client_error(format!(
                "Invite with id {invite_id} does not exist."
            )));
        }
        s.invites.insert(invite_id, invite);
        Ok(())
    })
}

#[allow(dead_code)]
pub fn list_org_invite_ids(org_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.organization_invite_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .map(|(_, invite_id)| invite_id)
            .collect()
    })
}

pub fn list_org_invites(org_id: Uuid) -> Vec<(Uuid, OrgInvite)> {
    with_state(|s| {
        s.organization_invite_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter_map(|(_, invite_id)| s.invites.get(&invite_id).map(|inv| (invite_id, inv)))
            .collect()
    })
}

// Scans all invites. The number of invites is bounded by
// MAX_PENDING_INVITES_PER_ORG * number_of_orgs, plus expired invites
// that have not yet been swept. Acceptable for the size of this system.
pub fn iter_invites() -> Vec<(Uuid, OrgInvite)> {
    with_state(|s| s.invites.iter().map(|e| e.into_pair()).collect())
}

pub fn count_pending_invites_for_org(org_id: Uuid, now_ns: u64) -> usize {
    with_state(|s| {
        s.organization_invite_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter(|(_, invite_id)| match s.invites.get(invite_id) {
                Some(inv) => inv.status == InviteStatus::Pending && inv.expires_at_ns > now_ns,
                None => false,
            })
            .count()
    })
}

// Removes all invites for an org that are expired at now_ns. Used
// before creating a new invite to bound stale storage.
pub fn sweep_expired_org_invites(org_id: Uuid, now_ns: u64) {
    mutate_state(|s| {
        while let Some(invite_id) = s
            .organization_invite_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .find_map(|(_, invite_id)| {
                s.invites.get(&invite_id).and_then(|inv| {
                    if inv.status == InviteStatus::Pending && inv.expires_at_ns <= now_ns {
                        Some(invite_id)
                    } else {
                        None
                    }
                })
            })
        {
            s.invites.remove(&invite_id);
            s.organization_invite_index.remove(&(org_id, invite_id));
        }
    });
}

#[allow(dead_code)]
pub fn delete_invite(invite_id: Uuid) -> ApiResult {
    mutate_state(|s| {
        let Some(invite) = s.invites.remove(&invite_id) else {
            return Err(ApiError::client_error(format!(
                "Invite with id {invite_id} does not exist."
            )));
        };
        s.organization_invite_index
            .remove(&(invite.org_id, invite_id));
        Ok(())
    })
}

struct InviteState {
    invites: OrgInviteMemory,
    organization_invite_index: OrganizationInviteIndexMemory,
}

impl Default for InviteState {
    fn default() -> Self {
        Self {
            invites: init_org_invites(),
            organization_invite_index: init_organization_invite_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<InviteState> = RefCell::new(InviteState::default());
}

fn with_state<R>(f: impl FnOnce(&InviteState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut InviteState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
