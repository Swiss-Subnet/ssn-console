use base64::{engine::general_purpose, Engine as _};
use candid::Principal;
use canister_utils::load_runtime_env;

thread_local! {
    pub static CANISTER_HISTORY_ID: Principal = {
        let id_str = load_runtime_env("CANISTER_HISTORY_ID").expect("CANISTER_HISTORY_ID env var is required");
        Principal::from_text(&id_str).expect("CANISTER_HISTORY_ID must be a valid Principal")
    };

    pub static PUBLIC_KEY_PRINCIPAL: Principal = {
        let pub_key_pem = load_runtime_env("PUBLIC_KEY").expect("PUBLIC_KEY env var is required");
        let base64_str = pub_key_pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect::<String>();
        let pub_key_der = general_purpose::STANDARD
            .decode(base64_str.trim())
            .expect("Failed to decode public key");
        Principal::self_authenticating(&pub_key_der)
    };
}

pub fn init_canister_history_id() {
    CANISTER_HISTORY_ID.with(|_| {});
}

pub fn get_canister_history_id() -> Principal {
    CANISTER_HISTORY_ID.with(|id| *id)
}

pub fn init_public_key() {
    PUBLIC_KEY_PRINCIPAL.with(|_| {});
}

pub fn get_public_key_principal() -> Principal {
    PUBLIC_KEY_PRINCIPAL.with(|p| *p)
}
