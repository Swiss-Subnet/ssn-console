use crate::{
    constants::{INVITE_TTL_NS, MAX_PENDING_INVITES_PER_ORG},
    data::{
        self, invite_repository, organization_repository, user_profile_repository, InviteStatus,
        OrgInvite, OrgPermissions,
    },
    dto::{
        AcceptOrgInviteRequest, AcceptOrgInviteResponse, CreateOrgInviteRequest,
        CreateOrgInviteResponse, DeclineOrgInviteRequest, DeclineOrgInviteResponse,
        ListMyInvitesResponse, ListOrgInvitesRequest, ListOrgInvitesResponse,
        RevokeOrgInviteRequest, RevokeOrgInviteResponse,
    },
    mapping::{map_invite_target_to_data, map_invite_to_dto},
    service::access_control_service::OrgAuth,
    validation::Email,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

// Creates an org invite. Intentionally does not leak whether the target
// (email / user_id / principal) refers to an existing user, so that
// sending an invite cannot be used to enumerate app accounts.
pub fn create_org_invite(
    caller: &Principal,
    req: CreateOrgInviteRequest,
    now_ns: u64,
) -> ApiResult<CreateOrgInviteResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::MEMBER_MANAGE)?;
    let caller_user_id = auth.user_id();

    let target = map_invite_target_to_data(req.target)
        .map_err(ApiError::client_error)
        .and_then(normalize_target)?;

    // For UserId/Principal targets, reject if the user is already a member.
    // Email targets are intentionally not resolved here, to preserve the
    // anti-enumeration property described above; accept-time idempotency
    // covers the duplicate case.
    let already_member_user_id = match &target {
        data::InviteTarget::UserId(target_user_id) => Some(*target_user_id),
        data::InviteTarget::Principal(target_principal) => {
            user_profile_repository::get_user_id_by_principal(target_principal)
        }
        data::InviteTarget::Email(_) => None,
    };
    if let Some(target_user_id) = already_member_user_id {
        if organization_repository::is_user_in_org(target_user_id, org_id) {
            return Err(ApiError::client_error(
                "User is already a member of this organization.".to_string(),
            ));
        }
    }

    invite_repository::sweep_expired_org_invites(org_id, now_ns);
    if invite_repository::count_pending_invites_for_org(org_id, now_ns)
        >= MAX_PENDING_INVITES_PER_ORG
    {
        return Err(ApiError::client_error(format!(
            "Cannot have more than {MAX_PENDING_INVITES_PER_ORG} pending invites per organization."
        )));
    }

    let invite = OrgInvite {
        org_id,
        created_by: caller_user_id,
        created_at_ns: now_ns,
        expires_at_ns: now_ns + INVITE_TTL_NS,
        target,
        status: InviteStatus::Pending,
    };
    let invite_id = invite_repository::create_invite(invite.clone());
    let org_name = organization_repository::get_org(org_id)
        .map(|o| o.name)
        .unwrap_or_default();

    Ok(CreateOrgInviteResponse {
        invite: map_invite_to_dto(invite_id, invite, org_name),
    })
}

pub fn list_org_invites(
    caller: &Principal,
    req: ListOrgInvitesRequest,
    now_ns: u64,
) -> ApiResult<ListOrgInvitesResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    let org_name = organization_repository::get_org(auth.org_id())
        .map(|o| o.name)
        .unwrap_or_default();

    // Only show invites the caller created, to avoid leaking invitee
    // emails/principals to other org members. A MEMBER_MANAGE-gated
    // "see all org invites" variant is deferred to a follow-up PR.
    let invites =
        invite_repository::list_org_invites_by_creator(auth.org_id(), auth.user_id(), now_ns)
            .into_iter()
            .map(|(id, inv)| map_invite_to_dto(id, inv, org_name.clone()))
            .collect();

    Ok(invites)
}

pub fn revoke_org_invite(
    caller: &Principal,
    req: RevokeOrgInviteRequest,
) -> ApiResult<RevokeOrgInviteResponse> {
    let invite_id = Uuid::try_from(req.invite_id.as_str())?;

    let mut invite = invite_repository::get_invite(invite_id).ok_or_else(|| {
        ApiError::client_error(format!("Invite with id {invite_id} does not exist."))
    })?;
    let auth = OrgAuth::require(caller, invite.org_id, OrgPermissions::EMPTY)?;

    // The inviter can always revoke their own invite. Other org members
    // need MEMBER_MANAGE to revoke invites they did not create.
    if invite.created_by != auth.user_id() && !auth.perms().contains(OrgPermissions::MEMBER_MANAGE)
    {
        return Err(ApiError::unauthorized(
            "Only the inviter or a member manager can revoke this invite.".to_string(),
        ));
    }

    if invite.status != InviteStatus::Pending {
        return Err(ApiError::client_error(
            "Only pending invites can be revoked.".to_string(),
        ));
    }

    invite.status = InviteStatus::Revoked;
    invite_repository::update_invite(invite_id, invite)?;

    Ok(RevokeOrgInviteResponse {})
}

pub fn list_my_invites(caller: &Principal, now_ns: u64) -> ApiResult<ListMyInvitesResponse> {
    let caller_user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let caller_profile = user_profile_repository::get_user_profile_by_user_id(&caller_user_id)
        .ok_or_else(|| {
            ApiError::client_error(format!(
                "User profile for user with id {caller_user_id} does not exist."
            ))
        })?;
    let caller_principals = user_profile_repository::get_principals_by_user_id(caller_user_id);

    let invites = invite_repository::list_pending_invites(now_ns)
        .into_iter()
        .filter(|(_, inv)| {
            invite_matches_user(
                &inv.target,
                caller_user_id,
                &caller_principals,
                caller_profile.email.as_deref(),
                caller_profile.email_verified,
            )
        })
        .map(|(id, inv)| {
            let org_name = organization_repository::get_org(inv.org_id)
                .map(|o| o.name)
                .unwrap_or_default();
            map_invite_to_dto(id, inv, org_name)
        })
        .collect();

    Ok(invites)
}

pub fn accept_org_invite(
    caller: &Principal,
    req: AcceptOrgInviteRequest,
    now_ns: u64,
) -> ApiResult<AcceptOrgInviteResponse> {
    let invite_id = Uuid::try_from(req.invite_id.as_str())?;
    let caller_user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let caller_profile = user_profile_repository::get_user_profile_by_user_id(&caller_user_id)
        .ok_or_else(|| {
            ApiError::client_error(format!(
                "User profile for user with id {caller_user_id} does not exist."
            ))
        })?;
    let caller_principals = user_profile_repository::get_principals_by_user_id(caller_user_id);

    let mut invite = invite_repository::get_invite(invite_id).ok_or_else(|| {
        ApiError::client_error(format!("Invite with id {invite_id} does not exist."))
    })?;

    assert_invite_is_actionable_by(
        &invite,
        caller_user_id,
        &caller_principals,
        caller_profile.email.as_deref(),
        caller_profile.email_verified,
        now_ns,
    )?;

    // Adding the user to the org is idempotent: if they are already a
    // member (e.g. double-accept race), we still mark the invite as
    // Accepted.
    if !organization_repository::is_user_in_org(caller_user_id, invite.org_id) {
        organization_repository::add_user_to_org(caller_user_id, invite.org_id);
    }

    invite.status = InviteStatus::Accepted;
    invite_repository::update_invite(invite_id, invite)?;

    Ok(AcceptOrgInviteResponse {})
}

pub fn decline_org_invite(
    caller: &Principal,
    req: DeclineOrgInviteRequest,
    now_ns: u64,
) -> ApiResult<DeclineOrgInviteResponse> {
    let invite_id = Uuid::try_from(req.invite_id.as_str())?;
    let caller_user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let caller_profile = user_profile_repository::get_user_profile_by_user_id(&caller_user_id)
        .ok_or_else(|| {
            ApiError::client_error(format!(
                "User profile for user with id {caller_user_id} does not exist."
            ))
        })?;
    let caller_principals = user_profile_repository::get_principals_by_user_id(caller_user_id);

    let mut invite = invite_repository::get_invite(invite_id).ok_or_else(|| {
        ApiError::client_error(format!("Invite with id {invite_id} does not exist."))
    })?;

    assert_invite_is_actionable_by(
        &invite,
        caller_user_id,
        &caller_principals,
        caller_profile.email.as_deref(),
        caller_profile.email_verified,
        now_ns,
    )?;

    invite.status = InviteStatus::Declined;
    invite_repository::update_invite(invite_id, invite)?;

    Ok(DeclineOrgInviteResponse {})
}

fn normalize_target(target: data::InviteTarget) -> ApiResult<data::InviteTarget> {
    match target {
        data::InviteTarget::Email(email) => {
            let normalized = Email::try_from(email)?;
            Ok(data::InviteTarget::Email(normalized.into_inner()))
        }
        other => Ok(other),
    }
}

fn invite_matches_user(
    target: &data::InviteTarget,
    user_id: Uuid,
    principals: &[Principal],
    verified_email: Option<&str>,
    email_verified: bool,
) -> bool {
    match target {
        data::InviteTarget::UserId(target_user_id) => *target_user_id == user_id,
        data::InviteTarget::Principal(target_principal) => principals.contains(target_principal),
        data::InviteTarget::Email(target_email) => match (email_verified, verified_email) {
            (true, Some(email)) => email.eq_ignore_ascii_case(target_email),
            _ => false,
        },
    }
}

fn assert_invite_is_actionable_by(
    invite: &OrgInvite,
    user_id: Uuid,
    principals: &[Principal],
    verified_email: Option<&str>,
    email_verified: bool,
    now_ns: u64,
) -> ApiResult {
    if invite.status != InviteStatus::Pending {
        return Err(ApiError::client_error(
            "Invite is no longer pending.".to_string(),
        ));
    }
    if invite.expires_at_ns <= now_ns {
        return Err(ApiError::client_error("Invite has expired.".to_string()));
    }
    if !invite_matches_user(
        &invite.target,
        user_id,
        principals,
        verified_email,
        email_verified,
    ) {
        return Err(ApiError::unauthorized(
            "Invite is not addressed to the caller.".to_string(),
        ));
    }
    Ok(())
}
