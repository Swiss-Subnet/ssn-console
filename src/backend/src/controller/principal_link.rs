use crate::{
    dto::{
        AdminLinkPrincipalRequest, AdminLinkPrincipalResponse, AdminListLinkedPrincipalsRequest,
        AdminListLinkedPrincipalsResponse, AdminUnlinkPrincipalRequest,
        AdminUnlinkPrincipalResponse, GetMyPendingLinkCodeRequest, GetMyPendingLinkCodeResponse,
        LinkMyPrincipalRequest, LinkMyPrincipalResponse, LinkedPrincipalDto,
        ListMyLinkedPrincipalsRequest, ListMyLinkedPrincipalsResponse, PendingLinkCodeDto,
        RecoverAccountByEmailRequest, RecoverAccountByEmailResponse, RegisterLinkCodeRequest,
        RegisterLinkCodeResponse, RevokeMyLinkCodeRequest, RevokeMyLinkCodeResponse,
        SetMyPrincipalNameRequest, SetMyPrincipalNameResponse, UnlinkMyPrincipalRequest,
        UnlinkMyPrincipalResponse,
    },
    service::principal_link_service,
};
use canister_utils::{assert_authenticated, ApiResultDto, Uuid};
use ic_cdk::{api::msg_caller, *};

#[update]
fn register_link_code(req: RegisterLinkCodeRequest) -> ApiResultDto<RegisterLinkCodeResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::register_link_code(&caller, req.code, req.target_principal)
        .map(|out| RegisterLinkCodeResponse {
            expires_at_nanos: out.expires_at_nanos,
        })
        .into()
}

// Caller is the principal being linked. The code is pre-bound to a target
// principal at registration, so an intercepted code is useless from any other
// principal.
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
        .map(|entries| ListMyLinkedPrincipalsResponse {
            principals: entries
                .into_iter()
                .map(|e| LinkedPrincipalDto {
                    principal: e.principal,
                    name: e.name,
                })
                .collect(),
        })
        .into()
}

#[update]
fn set_my_principal_name(
    req: SetMyPrincipalNameRequest,
) -> ApiResultDto<SetMyPrincipalNameResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::set_my_principal_name(&caller, req.principal, req.name)
        .map(|()| SetMyPrincipalNameResponse {})
        .into()
}

#[query]
fn get_my_pending_link_code(
    _req: GetMyPendingLinkCodeRequest,
) -> ApiResultDto<GetMyPendingLinkCodeResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::get_my_pending_link_code(&caller)
        .map(|entry| GetMyPendingLinkCodeResponse {
            code: entry.map(|e| PendingLinkCodeDto {
                code: e.code,
                expires_at_nanos: e.expires_at_nanos,
                target_principal: e.target_principal,
            }),
        })
        .into()
}

#[update]
fn revoke_my_link_code(_req: RevokeMyLinkCodeRequest) -> ApiResultDto<RevokeMyLinkCodeResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::revoke_my_link_code(&caller)
        .map(|()| RevokeMyLinkCodeResponse {})
        .into()
}

// Staff-only escape hatch: attach a principal to any user account. The
// service layer enforces `MANAGE_USERS`; the controller only checks the
// caller is non-anonymous so authorisation errors don't leak through the
// generic anonymous-call path.
#[update]
fn admin_link_principal_to_user(
    req: AdminLinkPrincipalRequest,
) -> ApiResultDto<AdminLinkPrincipalResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    let user_id = match Uuid::try_from(req.user_id.as_str()) {
        Ok(id) => id,
        Err(err) => return ApiResultDto::Err(err),
    };

    principal_link_service::admin_link_principal_to_user(&caller, user_id, req.principal)
        .map(|()| AdminLinkPrincipalResponse {})
        .into()
}

#[update]
fn admin_unlink_principal_from_user(
    req: AdminUnlinkPrincipalRequest,
) -> ApiResultDto<AdminUnlinkPrincipalResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    let user_id = match Uuid::try_from(req.user_id.as_str()) {
        Ok(id) => id,
        Err(err) => return ApiResultDto::Err(err),
    };

    principal_link_service::admin_unlink_principal_from_user(&caller, user_id, req.principal)
        .map(|()| AdminUnlinkPrincipalResponse {})
        .into()
}

#[query]
fn admin_list_linked_principals(
    req: AdminListLinkedPrincipalsRequest,
) -> ApiResultDto<AdminListLinkedPrincipalsResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    let user_id = match Uuid::try_from(req.user_id.as_str()) {
        Ok(id) => id,
        Err(err) => return ApiResultDto::Err(err),
    };

    principal_link_service::admin_list_linked_principals(&caller, user_id)
        .map(|principals| AdminListLinkedPrincipalsResponse { principals })
        .into()
}

#[update]
fn recover_account_by_email(
    req: RecoverAccountByEmailRequest,
) -> ApiResultDto<RecoverAccountByEmailResponse> {
    let caller = msg_caller();
    if let Err(err) = assert_authenticated(&caller) {
        return ApiResultDto::Err(err);
    }

    principal_link_service::recover_account_by_email(&caller, req.token)
        .map(|()| RecoverAccountByEmailResponse {})
        .into()
}
