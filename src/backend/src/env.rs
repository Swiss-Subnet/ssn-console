const NETWORK: &str = dotenv!("DFX_NETWORK");

pub fn is_local() -> bool {
    NETWORK == "local"
}
