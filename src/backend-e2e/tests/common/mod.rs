// Shared test harness for the backend e2e suite.

// Candid type bindings generated from backend.did by build.rs (types only).
#[allow(dead_code, unused_imports, clippy::all)]
pub mod bindings {
    include!(concat!(env!("OUT_DIR"), "/bindings.rs"));
}

pub mod env;
pub mod scenario;

pub use env::principal;
pub use scenario::Fixture;
