use crate::data::{
    memory::{
        init_active_project_canister_index, init_canister_project_index, init_canisters,
        init_deleted_project_canister_index, init_principal_canister_index,
        ActiveProjectCanisterIndexMemory, CanisterMemory, CanisterProjectIndexMemory,
        DeletedProjectCanisterIndexMemory, PrincipalCanisterIndexMemory,
    },
    Canister,
};
use candid::Principal;
use canister_utils::Uuid;
use std::cell::RefCell;

pub fn project_has_canisters(project_id: Uuid) -> bool {
    with_state(|s| {
        let range = (project_id, Uuid::MIN)..=(project_id, Uuid::MAX);
        s.active_project_canister_index
            .range(range.clone())
            .any(|_| true)
            || s.deleted_project_canister_index.range(range).any(|_| true)
    })
}

pub fn list_active_canisters_by_project(project_id: Uuid) -> Vec<(Uuid, Canister)> {
    with_state(|s| {
        s.active_project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX))
            .filter_map(|(_, canister_id)| {
                s.canisters
                    .get(&canister_id)
                    .map(|canister| (canister_id, canister))
            })
            .collect()
    })
}

pub fn list_canisters_by_project_including_deleted(project_id: Uuid) -> Vec<(Uuid, Canister)> {
    with_state(|s| {
        let active = s
            .active_project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX));
        let deleted = s
            .deleted_project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX));

        active
            .chain(deleted)
            .filter_map(|(_, canister_id)| {
                s.canisters
                    .get(&canister_id)
                    .map(|canister| (canister_id, canister))
            })
            .collect()
    })
}

pub fn list_canisters_with_project(limit: usize, page: usize) -> Vec<(Uuid, Canister, Uuid)> {
    with_state(|s| {
        s.canisters
            .iter()
            .skip(limit * (page - 1))
            .take(limit)
            .map(|val| val.into_pair())
            .filter_map(|(canister_id, canister)| {
                s.canister_project_index
                    .get(&canister_id)
                    .map(|project_id| (canister_id, canister, project_id))
            })
            .collect()
    })
}

pub fn create_canister(project_id: Uuid, canister: Canister) -> Uuid {
    let canister_id = Uuid::new();

    mutate_state(|s| {
        s.canisters.insert(canister_id, canister.clone());
        s.active_project_canister_index
            .insert((project_id, canister_id));
        s.canister_project_index.insert(canister_id, project_id);
        s.principal_canister_index
            .insert(canister.principal, canister_id);
    });

    canister_id
}

pub fn get_canister_count() -> u64 {
    with_state(|s| s.canisters.len())
}

pub fn get_canister_project_id(canister_id: Uuid) -> Option<Uuid> {
    with_state(|s| s.canister_project_index.get(&canister_id))
}

pub fn soft_delete_canister(
    project_id: Uuid,
    canister_id: Uuid,
    deleted_at: u64,
) -> Option<Canister> {
    mutate_state(|s| {
        if !s
            .active_project_canister_index
            .contains(&(project_id, canister_id))
        {
            return None;
        }

        let mut canister = s.canisters.get(&canister_id)?;
        canister.deleted_at = Some(deleted_at);
        s.canisters.insert(canister_id, canister.clone());

        s.active_project_canister_index
            .remove(&(project_id, canister_id));
        s.deleted_project_canister_index
            .insert((project_id, canister_id));

        Some(canister)
    })
}

pub fn get_canister_by_principal(principal: Principal) -> Option<Uuid> {
    with_state(|s| s.principal_canister_index.get(&principal))
}

pub fn migrate_principal_canister_index() {
    mutate_state(|s| {
        for (canister_id, canister) in s.canisters.iter().map(|v| v.into_pair()) {
            s.principal_canister_index
                .insert(canister.principal, canister_id);
        }
    });
}

pub fn update_canister_name(canister_id: Uuid, name: Option<String>) -> Option<Canister> {
    mutate_state(|s| {
        let mut canister = s.canisters.get(&canister_id)?;
        canister.name = name;
        s.canisters.insert(canister_id, canister.clone());
        Some(canister)
    })
}

struct CanisterState {
    canisters: CanisterMemory,
    active_project_canister_index: ActiveProjectCanisterIndexMemory,
    deleted_project_canister_index: DeletedProjectCanisterIndexMemory,
    canister_project_index: CanisterProjectIndexMemory,
    principal_canister_index: PrincipalCanisterIndexMemory,
}

impl Default for CanisterState {
    fn default() -> Self {
        Self {
            canisters: init_canisters(),
            active_project_canister_index: init_active_project_canister_index(),
            deleted_project_canister_index: init_deleted_project_canister_index(),
            canister_project_index: init_canister_project_index(),
            principal_canister_index: init_principal_canister_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<CanisterState> = RefCell::new(CanisterState::default());
}

fn with_state<R>(f: impl FnOnce(&CanisterState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut CanisterState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
