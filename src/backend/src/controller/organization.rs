use crate::{
    dto::{
        CreateOrganizationRequest, CreateOrganizationResponse, DeleteOrganizationRequest,
        GetOrganizationRequest, GetOrganizationResponse, ListMyOrganizationsResponse,
        UpdateOrganizationRequest, UpdateOrganizationResponse,
    },
    service::organization_service,
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[query]
fn list_my_organizations() -> ApiResultDto<ListMyOrganizationsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::list_my_organizations(&caller).into()
}

#[update]
fn create_organization(req: CreateOrganizationRequest) -> ApiResultDto<CreateOrganizationResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::create_organization(&caller, req).into()
}

#[query]
fn get_organization(req: GetOrganizationRequest) -> ApiResultDto<GetOrganizationResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::get_organization(&caller, req).into()
}

#[update]
fn update_organization(req: UpdateOrganizationRequest) -> ApiResultDto<UpdateOrganizationResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::update_organization(&caller, req).into()
}

#[update]
fn delete_organization(req: DeleteOrganizationRequest) -> ApiResultDto<()> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    organization_service::delete_organization(&caller, req).into()
}
