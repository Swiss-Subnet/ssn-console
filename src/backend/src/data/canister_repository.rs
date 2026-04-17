use crate::data::{
    memory::{
        init_canister_project_index, init_canisters, init_project_canister_index, CanisterMemory,
        CanisterProjectIndexMemory, ProjectCanisterIndexMemory,
    },
    Canister,
};
use canister_utils::Uuid;
use std::cell::RefCell;

pub fn project_has_canisters(project_id: Uuid) -> bool {
    with_state(|s| {
        s.project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX))
            .any(|_| true)
    })
}

pub fn list_canisters_by_project(project_id: Uuid) -> Vec<(Uuid, Canister)> {
    with_state(|s| {
        s.project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX))
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
        s.canisters.insert(canister_id, canister);
        s.project_canister_index.insert((project_id, canister_id));
        s.canister_project_index.insert(canister_id, project_id);
    });

    canister_id
}

pub fn get_canister_count() -> u64 {
    with_state(|s| s.canisters.len())
}

pub fn get_canister_project_id(canister_id: Uuid) -> Option<Uuid> {
    with_state(|s| s.canister_project_index.get(&canister_id))
}

pub fn get_canister_in_project(project_id: Uuid, canister_id: Uuid) -> Option<Canister> {
    with_state(|s| {
        if s.project_canister_index
            .contains(&(project_id, canister_id))
        {
            s.canisters.get(&canister_id)
        } else {
            None
        }
    })
}

pub fn remove_canister(project_id: Uuid, canister_id: Uuid) {
    mutate_state(|s| {
        s.canisters.remove(&canister_id);
        s.project_canister_index.remove(&(project_id, canister_id));
        s.canister_project_index.remove(&canister_id);
    });
}

struct CanisterState {
    canisters: CanisterMemory,
    project_canister_index: ProjectCanisterIndexMemory,
    canister_project_index: CanisterProjectIndexMemory,
}

impl Default for CanisterState {
    fn default() -> Self {
        Self {
            canisters: init_canisters(),
            project_canister_index: init_project_canister_index(),
            canister_project_index: init_canister_project_index(),
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
