use crate::{
    dto::{
        LinkMyPrincipalRequest, LinkMyPrincipalResponse, ListMyLinkedPrincipalsRequest,
        ListMyLinkedPrincipalsResponse, ListMyPendingLinkCodesRequest,
        ListMyPendingLinkCodesResponse, PendingLinkCodeDto, RegisterLinkCodeRequest,
        RegisterLinkCodeResponse, RevokeLinkCodeRequest, RevokeLinkCodeResponse,
        UnlinkMyPrincipalRequest, UnlinkMyPrincipalResponse,
    },
    service::principal_link_service,
};
use canister_utils::{assert_authenticated, ApiResultDto};
use ic_cdk::{api::msg_caller, *};

#[update]
fn register_link_code(req: RegisterLinkCodeRequest) -> ApiResultDto<RegisterLinkCodeResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::register_link_code(&caller, req.code)
        .map(|out| RegisterLinkCodeResponse {
            expires_at_nanos: out.expires_at_nanos,
        })
        .into()
}

// Caller is the principal being linked. The link-code binding (`code -> user_id`)
// was set up by an earlier call from one of the user's already-authenticated
// principals; this call merely proves the new principal can sign for itself.
#[update]
fn link_my_principal(req: LinkMyPrincipalRequest) -> ApiResultDto<LinkMyPrincipalResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::link_my_principal(&caller, req.code)
        .map(|()| LinkMyPrincipalResponse {})
        .into()
}

#[update]
fn unlink_my_principal(req: UnlinkMyPrincipalRequest) -> ApiResultDto<UnlinkMyPrincipalResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::unlink_my_principal(&caller, req.principal)
        .map(|()| UnlinkMyPrincipalResponse {})
        .into()
}

#[query]
fn list_my_linked_principals(
    _req: ListMyLinkedPrincipalsRequest,
) -> ApiResultDto<ListMyLinkedPrincipalsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::list_my_linked_principals(&caller)
        .map(|principals| ListMyLinkedPrincipalsResponse { principals })
        .into()
}

#[query]
fn list_my_pending_link_codes(
    _req: ListMyPendingLinkCodesRequest,
) -> ApiResultDto<ListMyPendingLinkCodesResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::list_my_pending_link_codes(&caller)
        .map(|entries| ListMyPendingLinkCodesResponse {
            codes: entries
                .into_iter()
                .map(|e| PendingLinkCodeDto {
                    code: e.code,
                    expires_at_nanos: e.expires_at_nanos,
                })
                .collect(),
        })
        .into()
}

#[update]
fn revoke_link_code(req: RevokeLinkCodeRequest) -> ApiResultDto<RevokeLinkCodeResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::revoke_link_code(&caller, req.code)
        .map(|()| RevokeLinkCodeResponse {})
        .into()
}
