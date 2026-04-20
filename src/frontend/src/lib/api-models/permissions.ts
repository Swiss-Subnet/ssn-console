import type {
  OrgPermissions as ApiOrgPermissions,
  ProjectPermissions as ApiProjectPermissions,
} from '@ssn/backend-api';

export type OrgPermissions = {
  orgAdmin: boolean;
  memberManage: boolean;
  teamManage: boolean;
  projectCreate: boolean;
  billingManage: boolean;
};

export type ProjectPermissions = {
  projectAdmin: boolean;
  canisterManage: boolean;
  proposalCreate: boolean;
  proposalApprove: boolean;
  canisterOperate: boolean;
  canisterRead: boolean;
  approvalPolicyManage: boolean;
  projectSettings: boolean;
};

export const emptyOrgPermissions: OrgPermissions = {
  orgAdmin: false,
  memberManage: false,
  teamManage: false,
  projectCreate: false,
  billingManage: false,
};

export const emptyProjectPermissions: ProjectPermissions = {
  projectAdmin: false,
  canisterManage: false,
  proposalCreate: false,
  proposalApprove: false,
  canisterOperate: false,
  canisterRead: false,
  approvalPolicyManage: false,
  projectSettings: false,
};

export function mapOrgPermissions(res: ApiOrgPermissions): OrgPermissions {
  return {
    orgAdmin: res.org_admin,
    memberManage: res.member_manage,
    teamManage: res.team_manage,
    projectCreate: res.project_create,
    billingManage: res.billing_manage,
  };
}

export function mapOrgPermissionsToApi(
  perms: OrgPermissions,
): ApiOrgPermissions {
  return {
    org_admin: perms.orgAdmin,
    member_manage: perms.memberManage,
    team_manage: perms.teamManage,
    project_create: perms.projectCreate,
    billing_manage: perms.billingManage,
  };
}

export function mapProjectPermissions(
  res: ApiProjectPermissions,
): ProjectPermissions {
  return {
    projectAdmin: res.project_admin,
    canisterManage: res.canister_manage,
    proposalCreate: res.proposal_create,
    proposalApprove: res.proposal_approve,
    canisterOperate: res.canister_operate,
    canisterRead: res.canister_read,
    approvalPolicyManage: res.approval_policy_manage,
    projectSettings: res.project_settings,
  };
}

export function mapProjectPermissionsToApi(
  perms: ProjectPermissions,
): ApiProjectPermissions {
  return {
    project_admin: perms.projectAdmin,
    canister_manage: perms.canisterManage,
    proposal_create: perms.proposalCreate,
    proposal_approve: perms.proposalApprove,
    canister_operate: perms.canisterOperate,
    canister_read: perms.canisterRead,
    approval_policy_manage: perms.approvalPolicyManage,
    project_settings: perms.projectSettings,
  };
}
