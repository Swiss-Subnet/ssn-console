use crate::{
    data::{self},
    dto::{self},
};
use canister_utils::Uuid;

pub fn map_invite_target_to_data(target: dto::InviteTarget) -> Result<data::InviteTarget, String> {
    match target {
        dto::InviteTarget::Email(email) => Ok(data::InviteTarget::Email(email)),
        dto::InviteTarget::UserId(id) => {
            let uuid = Uuid::try_from(id.as_str()).map_err(|e| e.message().to_string())?;
            Ok(data::InviteTarget::UserId(uuid))
        }
        dto::InviteTarget::Principal(p) => Ok(data::InviteTarget::Principal(p)),
    }
}

pub fn map_invite_target_to_dto(target: data::InviteTarget) -> dto::InviteTarget {
    match target {
        data::InviteTarget::Email(email) => dto::InviteTarget::Email(email),
        data::InviteTarget::UserId(uuid) => dto::InviteTarget::UserId(uuid.to_string()),
        data::InviteTarget::Principal(p) => dto::InviteTarget::Principal(p),
    }
}

pub fn map_invite_status_to_dto(status: data::InviteStatus) -> dto::InviteStatus {
    match status {
        data::InviteStatus::Pending => dto::InviteStatus::Pending,
        data::InviteStatus::Accepted => dto::InviteStatus::Accepted,
        data::InviteStatus::Declined => dto::InviteStatus::Declined,
        data::InviteStatus::Revoked => dto::InviteStatus::Revoked,
    }
}

pub fn map_invite_to_dto(
    invite_id: Uuid,
    invite: data::OrgInvite,
    org_name: String,
) -> dto::OrgInvite {
    dto::OrgInvite {
        id: invite_id.to_string(),
        org_id: invite.org_id.to_string(),
        org_name,
        created_by: invite.created_by.to_string(),
        created_at_ns: invite.created_at_ns,
        expires_at_ns: invite.expires_at_ns,
        target: map_invite_target_to_dto(invite.target),
        status: map_invite_status_to_dto(invite.status),
    }
}
