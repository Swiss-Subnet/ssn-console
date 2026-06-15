use canister_utils::ApiResultDto;
use dto::*;

mod constants;
mod controller;
mod dto;
mod env;
mod management_canister;
#[cfg(not(feature = "mock-metrics"))]
mod management_canister_types;
mod memory;
mod memory_manager;
mod model;
mod repository;
mod service;

ic_cdk::export_candid!();

#[cfg(test)]
mod tests {
    use super::*;
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::Path;

    // Bidirectional check so drift in either direction fails the build.
    #[test]
    fn check_candid_interface() {
        let exported = __export_service();
        let did_path = Path::new("../cycles-monitor-api/cycles_monitor.did");

        service_compatible(CandidSource::Text(&exported), CandidSource::File(did_path))
            .expect("canister export must implement everything declared in cycles_monitor.did");
        service_compatible(CandidSource::File(did_path), CandidSource::Text(&exported))
            .expect("cycles_monitor.did must declare every method the canister exports");
    }
}
