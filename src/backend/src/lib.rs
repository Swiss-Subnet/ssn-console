use backend_api::*;
use canister_utils::ApiResultDto;
use dto::*;
use ic_http_certification::{HttpRequest, HttpResponse};

mod constants;
mod controller;
mod data;
mod dto;
mod env;
mod jwt;
mod mapping;
mod service;
#[cfg(test)]
mod test_support;
mod validation;

#[cfg(all(not(feature = "canbench-rs"), feature = "embed-frontend"))]
#[macro_use]
extern crate dotenv_codegen;

ic_cdk::export_candid!();

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    env::init_auth_service_url();
    env::init_public_key();
    env::init_public_key_principal();
    env::init_canister_history_id();

    #[cfg(not(feature = "canbench-rs"))]
    controller::http::init();
    data::team_repository::migrate_org_team_permissions();
    data::project_repository::migrate_project_team_permissions();
    data::canister_repository::migrate_principal_canister_index();
    data::user_profile_repository::migrate_verified_email_index();
    data::proposal_repository::migrate_proposals_proposer_id();
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::Path;

    // Bidirectional check so drift in either direction fails the build.
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
