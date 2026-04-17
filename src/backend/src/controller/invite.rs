use crate::{
    dto::{
        AcceptOrgInviteRequest, AcceptOrgInviteResponse, CreateOrgInviteRequest,
        CreateOrgInviteResponse, DeclineOrgInviteRequest, DeclineOrgInviteResponse,
        ListMyInvitesResponse, ListOrgInvitesRequest, ListOrgInvitesResponse,
        RevokeOrgInviteRequest, RevokeOrgInviteResponse,
    },
    service::invite_service,
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{
    api::{msg_caller, time},
    *,
};

#[update]
fn create_org_invite(req: CreateOrgInviteRequest) -> ApiResultDto<CreateOrgInviteResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::create_org_invite(&caller, req, time()).into()
}

#[query]
fn list_org_invites(req: ListOrgInvitesRequest) -> ApiResultDto<ListOrgInvitesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::list_org_invites(&caller, req, time()).into()
}

#[update]
fn revoke_org_invite(req: RevokeOrgInviteRequest) -> ApiResultDto<RevokeOrgInviteResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::revoke_org_invite(&caller, req).into()
}

#[query]
fn list_my_invites() -> ApiResultDto<ListMyInvitesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::list_my_invites(&caller, time()).into()
}

#[update]
fn accept_org_invite(req: AcceptOrgInviteRequest) -> ApiResultDto<AcceptOrgInviteResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::accept_org_invite(&caller, req, time()).into()
}

#[update]
fn decline_org_invite(req: DeclineOrgInviteRequest) -> ApiResultDto<DeclineOrgInviteResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    invite_service::decline_org_invite(&caller, req, time()).into()
}
