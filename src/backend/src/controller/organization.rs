use crate::{dto::ListMyOrganizationsResponse, service::organization_service};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_organizations() -> ApiResultDto<ListMyOrganizationsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::list_my_organizations(caller).into()
}
