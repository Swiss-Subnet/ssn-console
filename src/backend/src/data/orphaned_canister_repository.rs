use crate::data::memory::{
    init_orphaned_canister_child_parent_index, init_orphaned_canister_parent_child_index,
    OrphanedCanisterChildParentIndexMemory, OrphanedCanisterParentChildIndexMemory,
};
use candid::Principal;
use canister_utils::{MAX_PRINCIPAL, MIN_PRINCIPAL};
use std::cell::RefCell;

pub fn create_orphaned_canister(child_principal: Principal, parent_principal: Principal) {
    mutate_state(|s| {
        s.child_to_parent_index
            .insert(child_principal, parent_principal);
        s.parent_child_index
            .insert((parent_principal, child_principal));
    });
}

pub fn get_parent_by_child(child_principal: Principal) -> Option<Principal> {
    with_state(|s| s.child_to_parent_index.get(&child_principal))
}

pub fn list_children_by_parent(parent_principal: Principal) -> Vec<Principal> {
    with_state(|s| {
        s.parent_child_index
            .range((parent_principal, MIN_PRINCIPAL)..=(parent_principal, MAX_PRINCIPAL))
            .map(|(_parent, child)| child)
            .collect()
    })
}

pub fn remove_orphaned_canister(child_principal: Principal, parent_principal: Principal) {
    mutate_state(|s| {
        s.parent_child_index
            .remove(&(parent_principal, child_principal));
        s.child_to_parent_index.remove(&child_principal);
    });
}

struct OrphanedCanisterState {
    child_to_parent_index: OrphanedCanisterChildParentIndexMemory,
    parent_child_index: OrphanedCanisterParentChildIndexMemory,
}

impl Default for OrphanedCanisterState {
    fn default() -> Self {
        Self {
            child_to_parent_index: init_orphaned_canister_child_parent_index(),
            parent_child_index: init_orphaned_canister_parent_child_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<OrphanedCanisterState> = RefCell::new(OrphanedCanisterState::default());
}

fn with_state<R>(f: impl FnOnce(&OrphanedCanisterState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut OrphanedCanisterState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
