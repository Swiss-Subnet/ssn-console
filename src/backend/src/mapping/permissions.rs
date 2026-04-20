use crate::{data, dto};

pub fn map_org_permissions(perms: data::OrgPermissions) -> dto::OrgPermissions {
    dto::OrgPermissions {
        org_admin: perms.contains(data::OrgPermissions::ORG_ADMIN),
        member_manage: perms.contains(data::OrgPermissions::MEMBER_MANAGE),
        team_manage: perms.contains(data::OrgPermissions::TEAM_MANAGE),
        project_create: perms.contains(data::OrgPermissions::PROJECT_CREATE),
        billing_manage: perms.contains(data::OrgPermissions::BILLING_MANAGE),
    }
}

pub fn map_org_permissions_from_dto(perms: dto::OrgPermissions) -> data::OrgPermissions {
    let mut out = data::OrgPermissions::EMPTY;
    if perms.org_admin {
        out = out.union(data::OrgPermissions::ORG_ADMIN);
    }
    if perms.member_manage {
        out = out.union(data::OrgPermissions::MEMBER_MANAGE);
    }
    if perms.team_manage {
        out = out.union(data::OrgPermissions::TEAM_MANAGE);
    }
    if perms.project_create {
        out = out.union(data::OrgPermissions::PROJECT_CREATE);
    }
    if perms.billing_manage {
        out = out.union(data::OrgPermissions::BILLING_MANAGE);
    }
    out
}

pub fn map_project_permissions(perms: data::ProjectPermissions) -> dto::ProjectPermissions {
    dto::ProjectPermissions {
        project_admin: perms.contains(data::ProjectPermissions::PROJECT_ADMIN),
        canister_manage: perms.contains(data::ProjectPermissions::CANISTER_MANAGE),
        proposal_create: perms.contains(data::ProjectPermissions::PROPOSAL_CREATE),
        proposal_approve: perms.contains(data::ProjectPermissions::PROPOSAL_APPROVE),
        canister_operate: perms.contains(data::ProjectPermissions::CANISTER_OPERATE),
        canister_read: perms.contains(data::ProjectPermissions::CANISTER_READ),
        approval_policy_manage: perms.contains(data::ProjectPermissions::APPROVAL_POLICY_MANAGE),
        project_settings: perms.contains(data::ProjectPermissions::PROJECT_SETTINGS),
    }
}

pub fn map_project_permissions_from_dto(
    perms: dto::ProjectPermissions,
) -> data::ProjectPermissions {
    let mut out = data::ProjectPermissions::EMPTY;
    if perms.project_admin {
        out = out.union(data::ProjectPermissions::PROJECT_ADMIN);
    }
    if perms.canister_manage {
        out = out.union(data::ProjectPermissions::CANISTER_MANAGE);
    }
    if perms.proposal_create {
        out = out.union(data::ProjectPermissions::PROPOSAL_CREATE);
    }
    if perms.proposal_approve {
        out = out.union(data::ProjectPermissions::PROPOSAL_APPROVE);
    }
    if perms.canister_operate {
        out = out.union(data::ProjectPermissions::CANISTER_OPERATE);
    }
    if perms.canister_read {
        out = out.union(data::ProjectPermissions::CANISTER_READ);
    }
    if perms.approval_policy_manage {
        out = out.union(data::ProjectPermissions::APPROVAL_POLICY_MANAGE);
    }
    if perms.project_settings {
        out = out.union(data::ProjectPermissions::PROJECT_SETTINGS);
    }
    out
}
