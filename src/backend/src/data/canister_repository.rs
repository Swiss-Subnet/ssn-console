use crate::data::{
    memory::{init_canister_user_index, init_canisters, CanisterMemory, CanisterUserIndexMemory},
    Canister, Uuid,
};
use std::cell::RefCell;

pub fn list_canisters() -> Vec<(Uuid, Canister)> {
    with_state(|s| s.canisters.iter().map(|e| e.into_pair()).collect())
}

pub fn list_canisters_by_user(user_id: Uuid) -> Vec<(Uuid, Canister)> {
    with_state(|s| {
        s.canister_user_index
            .range((user_id, Uuid::MIN)..=(user_id, Uuid::MAX))
            .filter_map(|(_, canister_id)| {
                s.canisters
                    .get(&canister_id)
                    .map(|canister| (canister_id, canister))
            })
            .collect()
    })
}

pub fn create_canister(user_id: Uuid, canister: Canister) -> Uuid {
    let canister_id = Uuid::new();

    mutate_state(|s| {
        s.canisters.insert(canister_id, canister);
        s.canister_user_index.insert((user_id, canister_id));
    });

    canister_id
}

struct CanisterState {
    canisters: CanisterMemory,
    canister_user_index: CanisterUserIndexMemory,
}

impl Default for CanisterState {
    fn default() -> Self {
        Self {
            canisters: init_canisters(),
            canister_user_index: init_canister_user_index(),
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
