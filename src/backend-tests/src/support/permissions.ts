import type { OrgPermissions, ProjectPermissions } from '@ssn/backend-api';

export const allOrgPermissions: OrgPermissions = {
  org_admin: true,
  member_manage: true,
  team_manage: true,
  project_create: true,
  billing_manage: true,
};

export const emptyOrgPermissions: OrgPermissions = {
  org_admin: false,
  member_manage: false,
  team_manage: false,
  project_create: false,
  billing_manage: false,
};

export const allProjectPermissions: ProjectPermissions = {
  project_admin: true,
  canister_manage: true,
  proposal_create: true,
  proposal_approve: true,
  canister_operate: true,
  canister_read: true,
  approval_policy_manage: true,
  project_settings: true,
};

export const emptyProjectPermissions: ProjectPermissions = {
  project_admin: false,
  canister_manage: false,
  proposal_create: false,
  proposal_approve: false,
  canister_operate: false,
  canister_read: false,
  approval_policy_manage: false,
  project_settings: false,
};
