// Shared test harness for the backend e2e suite. Each test file is its own
// crate and compiles `common` fresh, so helpers used by only one file look
// unused to the others; the suite-wide allow silences that false positive.
#![allow(dead_code)]

// Candid type bindings generated from backend.did by build.rs (types only).
#[allow(dead_code, unused_imports, clippy::all)]
pub mod bindings {
    include!(concat!(env!("OUT_DIR"), "/bindings.rs"));
}

pub mod env;
pub mod scenario;

pub use env::principal;
pub use scenario::Fixture;
