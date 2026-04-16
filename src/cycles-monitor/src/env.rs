use candid::Principal;
use canister_utils::load_runtime_env;

thread_local! {
    pub static CANISTER_HISTORY_ID: Principal = {
        let id_str = load_runtime_env("CANISTER_HISTORY_ID").expect("CANISTER_HISTORY_ID env var is required");
        Principal::from_text(&id_str).expect("CANISTER_HISTORY_ID must be a valid Principal")
    };
}

pub fn init_canister_history_id() {
    CANISTER_HISTORY_ID.with(|_| {});
}

pub fn get_canister_history_id() -> Principal {
    CANISTER_HISTORY_ID.with(|id| *id)
}
