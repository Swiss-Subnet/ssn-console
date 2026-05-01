use crate::data::{
    memory::{init_canister_usage, CanisterUsageMemory},
    CanisterUsage,
};
use candid::Principal;
use std::cell::RefCell;

struct State {
    canister_usage: CanisterUsageMemory,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State {
        canister_usage: init_canister_usage(),
    });
}

pub fn upsert_canister_usage(usage: CanisterUsage) {
    STATE.with(|s| {
        s.borrow_mut()
            .canister_usage
            .insert((usage.canister_id, usage.month), usage);
    });
}

pub fn get_canister_usage(canister_id: Principal, month: u32) -> Option<CanisterUsage> {
    STATE.with(|s| s.borrow().canister_usage.get(&(canister_id, month)))
}
