use candid::export_service;
use canister_utils::ApiResultDto;
use dto::*;
use ic_cdk::*;

mod constants;
mod controller;
mod dto;
mod env;
mod management_canister_mock;
mod memory;
mod memory_manager;
mod model;
mod repository;
mod service;

export_service!();

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::Path;

    #[test]
    fn check_candid_interface() {
        service_compatible(
            CandidSource::File(Path::new("../cycles-monitor-api/cycles_monitor.did")),
            CandidSource::Text(&__export_service()),
        )
        .unwrap();
    }
}
