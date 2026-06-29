use base64::{engine::general_purpose, Engine as _};
use candid::Principal;
use canister_utils::load_runtime_env;

// dotenv! reads .env at compile time, which only exists in a dfx build.
#[cfg(all(not(feature = "canbench-rs"), feature = "embed-frontend"))]
const NETWORK: &str = dotenv!("DFX_NETWORK");
#[cfg(any(feature = "canbench-rs", not(feature = "embed-frontend")))]
const NETWORK: &str = "local";

pub fn is_local() -> bool {
    NETWORK == "local"
}

thread_local! {
    pub static AUTH_SERVICE_URL: String = {
        load_runtime_env("AUTH_SERVICE_URL").expect("AUTH_SERVICE_URL env var is required")
    };

    pub static PUBLIC_KEY: String = {
        load_runtime_env("PUBLIC_KEY").expect("PUBLIC_KEY env var is required")
    };

    pub static PUBLIC_KEY_PRINCIPAL: Principal = {
        let pub_key_pem = get_public_key();
        let base64_str = pub_key_pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect::<String>();
        let pub_key_der = general_purpose::STANDARD
            .decode(base64_str.trim())
            .expect("Failed to decode public key");
        Principal::self_authenticating(&pub_key_der)
    };

    pub static CANISTER_HISTORY_ID: Principal = {
        let id_str = load_runtime_env("CANISTER_HISTORY_ID").expect("CANISTER_HISTORY_ID env var is required");
        Principal::from_text(&id_str).expect("CANISTER_HISTORY_ID must be a valid Principal")
    };
}

pub fn init_auth_service_url() {
    AUTH_SERVICE_URL.with(|_| {});
}

pub fn get_auth_service_url() -> String {
    AUTH_SERVICE_URL.with(|url| url.clone())
}

pub fn init_public_key() {
    PUBLIC_KEY.with(|_| {});
}

pub fn get_public_key() -> String {
    PUBLIC_KEY.with(|url| url.clone())
}

pub fn init_public_key_principal() {
    PUBLIC_KEY_PRINCIPAL.with(|_| {});
}

pub fn get_public_key_principal() -> Principal {
    PUBLIC_KEY_PRINCIPAL.with(|p| *p)
}

pub fn init_canister_history_id() {
    CANISTER_HISTORY_ID.with(|_| {});
}

pub fn get_canister_history_id() -> Principal {
    CANISTER_HISTORY_ID.with(|id| *id)
}
