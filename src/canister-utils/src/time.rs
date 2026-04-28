// Non-wasm fallback exists so unit tests don't panic on `ic_cdk::api::time()`.
pub fn now_nanos() -> u64 {
    #[cfg(target_family = "wasm")]
    return ic_cdk::api::time();
    #[cfg(not(target_family = "wasm"))]
    0
}
