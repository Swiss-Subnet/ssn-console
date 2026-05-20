use candid::Principal;
use canister_utils::load_runtime_env;

thread_local! {
    pub static BACKEND_ID: Principal = {
        let id_str = load_runtime_env("BACKEND_ID").expect("BACKEND_ID env var is required");
        Principal::from_text(&id_str).expect("BACKEND_ID must be a valid Principal")
    };
}

pub fn init_backend_id() {
    BACKEND_ID.with(|_| {});
}

pub fn get_backend_id() -> Principal {
    BACKEND_ID.with(|id| *id)
}
