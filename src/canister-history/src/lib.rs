mod constants;
mod controller;
mod dto;
mod env;
mod mapping;
mod memory;
mod memory_manager;
mod model;
mod repository;
mod service;

use canister_history_api::*;
use canister_utils::ApiResultDto;
use dto::*;

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
        let did_path = Path::new("../canister-history-api/canister_history.did");

        service_compatible(CandidSource::Text(&exported), CandidSource::File(did_path))
            .expect("canister export must implement everything declared in canister_history.did");
        service_compatible(CandidSource::File(did_path), CandidSource::Text(&exported))
            .expect("canister_history.did must declare every method the canister exports");
    }
}
