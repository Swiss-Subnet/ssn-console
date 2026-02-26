use super::{TEAM_USER_INDEX_MEMORY_ID, USER_TEAM_INDEX_MEMORY_ID};
use crate::data::{
    memory::{get_memory, Memory, ORGANIZATION_TEAM_INDEX_MEMORY_ID, TEAM_MEMORY_ID},
    Team,
};
use canister_utils::Uuid;
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type TeamMemory = BTreeMap<Uuid, Team, Memory>;
pub type TeamUserIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type UserTeamIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;
pub type OrganizationTeamIndexMemory = BTreeSet<(Uuid, Uuid), Memory>;

pub fn init_teams() -> TeamMemory {
    TeamMemory::init(get_team_memory())
}

pub fn init_team_user_index() -> TeamUserIndexMemory {
    TeamUserIndexMemory::init(get_team_user_index_memory_id())
}

pub fn init_user_team_index() -> UserTeamIndexMemory {
    UserTeamIndexMemory::init(get_user_team_index_memory_id())
}

pub fn init_organization_team_index() -> OrganizationTeamIndexMemory {
    OrganizationTeamIndexMemory::init(get_organization_team_index_memory_id())
}

fn get_team_memory() -> Memory {
    get_memory(TEAM_MEMORY_ID)
}

fn get_team_user_index_memory_id() -> Memory {
    get_memory(TEAM_USER_INDEX_MEMORY_ID)
}

fn get_user_team_index_memory_id() -> Memory {
    get_memory(USER_TEAM_INDEX_MEMORY_ID)
}

fn get_organization_team_index_memory_id() -> Memory {
    get_memory(ORGANIZATION_TEAM_INDEX_MEMORY_ID)
}
