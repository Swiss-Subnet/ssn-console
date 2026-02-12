use super::{PROJECT_TEAM_INDEX_MEMORY_ID, TEAM_PROJECT_INDEX_MEMORY_ID};
use crate::data::{
    memory::{get_memory, Memory, ORGANIZATION_PROJECT_INDEX_MEMORY_ID, PROJECT_MEMORY_ID},
    Project, Uuid,
};
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type ProjectMemory = BTreeMap<Uuid, Project, Memory>;
pub type ProjectUserIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type UserProjectIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type OrganizationProjectIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_projects() -> ProjectMemory {
    ProjectMemory::init(get_project_memory())
}

pub fn init_project_team_index() -> ProjectUserIndexMemory {
    ProjectUserIndexMemory::init(get_project_team_index_memory_id())
}

pub fn init_team_project_index() -> UserProjectIndexMemory {
    UserProjectIndexMemory::init(get_team_project_index_memory_id())
}

pub fn init_organization_project_index() -> OrganizationProjectIndexMemory {
    OrganizationProjectIndexMemory::init(get_organization_project_index_memory_id())
}

fn get_project_memory() -> Memory {
    get_memory(PROJECT_MEMORY_ID)
}

fn get_project_team_index_memory_id() -> Memory {
    get_memory(PROJECT_TEAM_INDEX_MEMORY_ID)
}

fn get_team_project_index_memory_id() -> Memory {
    get_memory(TEAM_PROJECT_INDEX_MEMORY_ID)
}

fn get_organization_project_index_memory_id() -> Memory {
    get_memory(ORGANIZATION_PROJECT_INDEX_MEMORY_ID)
}
