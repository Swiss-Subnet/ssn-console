use super::{
    Memory, INVITE_STATUS_INDEX_MEMORY_ID, ORGANIZATION_INVITE_INDEX_MEMORY_ID,
    ORG_INVITE_MEMORY_ID,
};
use crate::data::{memory::get_memory, OrgInvite};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type OrgInviteMemory = BTreeMap<Uuid, OrgInvite, Memory>;
pub type OrganizationInviteIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type InviteStatusIndexMemory = BTreeSet<(u8, Uuid), Memory>;

pub fn init_org_invites() -> OrgInviteMemory {
    OrgInviteMemory::init(get_org_invite_memory())
}

pub fn init_organization_invite_index() -> OrganizationInviteIndexMemory {
    OrganizationInviteIndexMemory::init(get_organization_invite_index_memory())
}

pub fn init_invite_status_index() -> InviteStatusIndexMemory {
    InviteStatusIndexMemory::init(get_invite_status_index_memory())
}

fn get_org_invite_memory() -> Memory {
    get_memory(ORG_INVITE_MEMORY_ID)
}

fn get_organization_invite_index_memory() -> Memory {
    get_memory(ORGANIZATION_INVITE_INDEX_MEMORY_ID)
}

fn get_invite_status_index_memory() -> Memory {
    get_memory(INVITE_STATUS_INDEX_MEMORY_ID)
}
