use super::{
    memory::{
        init_invite_status_index, init_org_invites, init_organization_invite_index,
        InviteStatusIndexMemory, OrgInviteMemory, OrganizationInviteIndexMemory,
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
        s.invite_status_index
            .insert((invite.status.as_u8(), invite_id));
        s.invites.insert(invite_id, invite);
    });
    invite_id
}

pub fn get_invite(invite_id: Uuid) -> Option<OrgInvite> {
    with_state(|s| s.invites.get(&invite_id))
}

pub fn update_invite(invite_id: Uuid, invite: OrgInvite) -> ApiResult {
    mutate_state(|s| {
        let old = s.invites.get(&invite_id).ok_or_else(|| {
            ApiError::client_error(format!("Invite with id {invite_id} does not exist."))
        })?;
        s.invite_status_index
            .remove(&(old.status.as_u8(), invite_id));
        s.invite_status_index
            .insert((invite.status.as_u8(), invite_id));
        s.invites.insert(invite_id, invite);
        Ok(())
    })
}

pub fn list_org_invites_by_creator(
    org_id: Uuid,
    created_by: Uuid,
    now_ns: u64,
) -> Vec<(Uuid, OrgInvite)> {
    with_state(|s| {
        s.organization_invite_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter_map(|(_, invite_id)| s.invites.get(&invite_id).map(|inv| (invite_id, inv)))
            .filter(|(_, inv)| inv.created_by == created_by)
            .filter(|(_, inv)| {
                !(inv.status == InviteStatus::Pending && inv.expires_at_ns <= now_ns)
            })
            .collect()
    })
}

pub fn list_pending_invites(now_ns: u64) -> Vec<(Uuid, OrgInvite)> {
    let pending_status = InviteStatus::Pending.as_u8();
    with_state(|s| {
        s.invite_status_index
            .range((pending_status, Uuid::MIN)..=(pending_status, Uuid::MAX))
            .filter_map(|(_, invite_id)| s.invites.get(&invite_id).map(|inv| (invite_id, inv)))
            .filter(|(_, inv)| inv.expires_at_ns > now_ns)
            .collect()
    })
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
            if let Some(inv) = s.invites.remove(&invite_id) {
                s.invite_status_index
                    .remove(&(inv.status.as_u8(), invite_id));
            }
            s.organization_invite_index.remove(&(org_id, invite_id));
        }
    });
}

struct InviteState {
    invites: OrgInviteMemory,
    organization_invite_index: OrganizationInviteIndexMemory,
    invite_status_index: InviteStatusIndexMemory,
}

impl Default for InviteState {
    fn default() -> Self {
        Self {
            invites: init_org_invites(),
            organization_invite_index: init_organization_invite_index(),
            invite_status_index: init_invite_status_index(),
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
