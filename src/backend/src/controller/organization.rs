use crate::{
    dto::ListMyOrganizationsResponse,
    service::{access_control_service, organization_service},
};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_organizations() -> ListMyOrganizationsResponse {
    let calling_principal = msg_caller();
    if let Err(err) = access_control_service::assert_authenticated(&calling_principal) {
        trap(&err);
    }

    match organization_service::list_user_orgs(calling_principal) {
        Ok(response) => response,
        Err(err) => trap(&err),
    }
}
