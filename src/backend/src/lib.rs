use candid::export_service;
use canister_utils::ApiResultDto;
use dto::*;
use ic_cdk::*;
use ic_http_certification::{HttpRequest, HttpResponse};

mod constants;
mod controller;
mod data;
mod dto;
mod env;
mod jwt;
mod mapping;
mod service;
mod validation;

#[macro_use]
extern crate dotenv_codegen;

export_service!();
#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    env::init_offchain_service_url();
    env::init_public_key();
    env::init_canister_history_id();

    controller::http::init();
    data::team_repository::migrate_org_team_permissions();
    data::project_repository::migrate_project_team_permissions();
    data::canister_repository::migrate_principal_canister_index();
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
            CandidSource::File(Path::new("../backend-api/backend.did")),
        )
        .unwrap();
    }
}
