use candid::Principal;
use canister_utils::load_runtime_env;

thread_local! {
    pub static CANISTER_HISTORY_ID: Principal = {
        let id_str = load_runtime_env("CANISTER_HISTORY_ID").expect("CANISTER_HISTORY_ID env var is required");
        Principal::from_text(&id_str).expect("CANISTER_HISTORY_ID must be a valid Principal")
    };

    pub static PUBLIC_KEY: String = {
        load_runtime_env("PUBLIC_KEY").expect("PUBLIC_KEY env var is required")
    };
}

pub fn init_canister_history_id() {
    CANISTER_HISTORY_ID.with(|_| {});
}

pub fn get_canister_history_id() -> Principal {
    CANISTER_HISTORY_ID.with(|id| *id)
}

pub fn init_public_key() {
    PUBLIC_KEY.with(|_| {});
}

pub fn get_public_key() -> String {
    PUBLIC_KEY.with(|url| url.clone())
}
