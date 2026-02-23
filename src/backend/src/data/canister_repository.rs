use crate::data::{
    memory::{
        init_canisters, init_project_canister_index, CanisterMemory, ProjectCanisterIndexMemory,
    },
    Canister,
};
use canister_utils::Uuid;
use std::cell::RefCell;

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

pub fn list_canister_ids_by_project(project_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX))
            .map(|(_, canister_id)| canister_id)
            .collect()
    })
}

pub fn move_canister_from_user_to_project(user_id: Uuid, project_id: Uuid, canister_id: Uuid) {
    mutate_state(|s| {
        s.project_canister_index.remove(&(user_id, canister_id));
        s.project_canister_index.insert((project_id, canister_id));
    });
}

pub fn create_canister(project_id: Uuid, canister: Canister) -> Uuid {
    let canister_id = Uuid::new();

    mutate_state(|s| {
        s.canisters.insert(canister_id, canister);
        s.project_canister_index.insert((project_id, canister_id));
    });

    canister_id
}

struct CanisterState {
    canisters: CanisterMemory,
    project_canister_index: ProjectCanisterIndexMemory,
}

impl Default for CanisterState {
    fn default() -> Self {
        Self {
            canisters: init_canisters(),
            project_canister_index: init_project_canister_index(),
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
