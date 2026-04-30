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

    controller::http::init();
    data::team_repository::migrate_org_team_permissions();
    data::project_repository::migrate_project_team_permissions();
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::Path;

    // Bidirectional subtype check: each side must implement at least the
    // other's interface. Catches drift in both directions — adding a
    // canister method without updating the .did, *and* removing a .did
    // entry the canister still exposes. Stricter than a single
    // `service_compatible` call (which would silently allow new
    // canister-side methods), but more tolerant than `service_equal`,
    // which compares type-alias names and trips on structurally
    // equivalent variants like `DeleteTeamResponse` vs
    // `RevokeStaffPermissionsResponse`.
    #[test]
    fn check_candid_interface() {
        let exported = __export_service();
        let did_path = Path::new("../backend-api/backend.did");

        service_compatible(CandidSource::Text(&exported), CandidSource::File(did_path))
            .expect("canister export must implement everything declared in backend.did");
        service_compatible(CandidSource::File(did_path), CandidSource::Text(&exported))
            .expect("backend.did must declare every method the canister exports");
    }
}
