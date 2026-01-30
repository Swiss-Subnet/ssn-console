use candid::export_service;
use dto::*;
use ic_cdk::*;
use ic_http_certification::{HttpRequest, HttpResponse};

mod controller;
mod data;
mod dto;
mod mapping;
mod service;
mod utils;
mod env;

#[macro_use]
extern crate dotenv_codegen;

export_service!();
#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    controller::http::post_upgrade_init();
    data::user_profile_repository::initialize_stats_from_existing();
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::Path;

    #[test]
    fn check_candid_interface() {
        service_compatible(
            CandidSource::Text(&__export_service()),
            CandidSource::File(Path::new("./backend.did")),
        )
        .unwrap();
    }
}
