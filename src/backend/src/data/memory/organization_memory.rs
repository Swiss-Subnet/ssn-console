use super::{ORGANIZATION_USER_INDEX_MEMORY_ID, USER_ORGANIZATION_INDEX_MEMORY_ID};
use crate::data::{
    memory::{get_memory, Memory, ORGANIZATION_MEMORY_ID},
    Organization, Uuid,
};
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type OrganizationMemory = BTreeMap<Uuid, Organization, Memory>;
pub type OrganizationUserIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type UserOrganizationIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_organizations() -> OrganizationMemory {
    OrganizationMemory::init(get_organization_memory())
}

pub fn init_organization_user_index() -> OrganizationUserIndexMemory {
    OrganizationUserIndexMemory::init(get_organization_user_index_memory_id())
}

pub fn init_user_organization_index() -> UserOrganizationIndexMemory {
    UserOrganizationIndexMemory::init(get_user_organization_index_memory_id())
}

fn get_organization_memory() -> Memory {
    get_memory(ORGANIZATION_MEMORY_ID)
}

fn get_organization_user_index_memory_id() -> Memory {
    get_memory(ORGANIZATION_USER_INDEX_MEMORY_ID)
}

fn get_user_organization_index_memory_id() -> Memory {
    get_memory(USER_ORGANIZATION_INDEX_MEMORY_ID)
}
