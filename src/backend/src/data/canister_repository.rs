use crate::data::{
    memory::{
        init_canister_project_index, init_canisters, init_project_canister_count,
        init_project_canister_index, CanisterMemory, CanisterProjectIndexMemory,
        ProjectCanisterCountMemory, ProjectCanisterIndexMemory,
    },
    Canister,
};
use canister_utils::Uuid;
use std::{cell::RefCell, collections::HashMap};

pub fn list_canisters_by_project(
    project_id: Uuid,
    limit: usize,
    page: usize,
) -> Vec<(Uuid, Canister)> {
    with_state(|s| {
        s.project_canister_index
            .range((project_id, Uuid::MIN)..=(project_id, Uuid::MAX))
            .skip(limit * (page - 1))
            .take(limit)
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

        let count = s.project_canister_count.get(&project_id).unwrap_or(0);
        s.project_canister_count.insert(project_id, count + 1);
    });

    canister_id
}

pub fn get_canister_count() -> u64 {
    with_state(|s| s.canisters.len())
}

pub fn get_project_canister_count(project_id: Uuid) -> u64 {
    with_state(|s| s.project_canister_count.get(&project_id).unwrap_or(0))
}

pub fn migrate_project_canister_count() {
    mutate_state(|s| {
        let mut counts = HashMap::new();

        for (project_id, _) in s.project_canister_index.iter() {
            *counts.entry(project_id).or_insert(0) += 1;
        }

        for (project_id, count) in counts {
            s.project_canister_count.insert(project_id, count);
        }
    });
}

struct CanisterState {
    canisters: CanisterMemory,
    project_canister_index: ProjectCanisterIndexMemory,
    canister_project_index: CanisterProjectIndexMemory,
    project_canister_count: ProjectCanisterCountMemory,
}

impl Default for CanisterState {
    fn default() -> Self {
        Self {
            canisters: init_canisters(),
            project_canister_index: init_project_canister_index(),
            canister_project_index: init_canister_project_index(),
            project_canister_count: init_project_canister_count(),
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
