use canister_utils::load_runtime_env;

const NETWORK: &str = dotenv!("DFX_NETWORK");

pub fn is_local() -> bool {
    NETWORK == "local"
}

thread_local! {
    pub static OFFCHAIN_SERVICE_URL: String = {
        load_runtime_env("OFFCHAIN_SERVICE_URL").expect("OFFCHAIN_SERVICE_URL env var is required")
    };

    pub static PUBLIC_KEY: String = {
        load_runtime_env("PUBLIC_KEY").expect("PUBLIC_KEY env var is required")
    };
}

pub fn init_offchain_service_url() {
    OFFCHAIN_SERVICE_URL.with(|_| {});
}

pub fn get_offchain_service_url() -> String {
    OFFCHAIN_SERVICE_URL.with(|url| url.clone())
}

pub fn init_public_key() {
    PUBLIC_KEY.with(|_| {});
}

pub fn get_public_key() -> String {
    PUBLIC_KEY.with(|url| url.clone())
}
