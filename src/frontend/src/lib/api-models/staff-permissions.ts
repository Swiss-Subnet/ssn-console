import { mapOkResponse } from '@/lib/api-models/error';
import {
  mapUserStatusResponse,
  UserStatus,
} from '@/lib/api-models/user-profile';
import { fromCandidOpt } from '@/lib/utils';
import type {
  GrantStaffPermissionsRequest as ApiGrantStaffPermissionsRequest,
  GrantStaffPermissionsResponse as ApiGrantStaffPermissionsResponse,
  ListStaffResponse as ApiListStaffResponse,
  RevokeStaffPermissionsRequest as ApiRevokeStaffPermissionsRequest,
  RevokeStaffPermissionsResponse as ApiRevokeStaffPermissionsResponse,
  StaffMember as ApiStaffMember,
  StaffPermissions as ApiStaffPermissions,
} from '@ssn/backend-api';

export type StaffPermissions = {
  readAllOrgs: boolean;
  writeBilling: boolean;
};

export type StaffMember = {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  status: UserStatus;
  permissions: StaffPermissions;
};

export type ListStaffResponse = StaffMember[];

export type GrantStaffPermissionsRequest = {
  userId: string;
  permissions: StaffPermissions;
};

export type RevokeStaffPermissionsRequest = {
  userId: string;
};

export function mapStaffPermissionsResponse(
  res: ApiStaffPermissions,
): StaffPermissions {
  return {
    readAllOrgs: res.read_all_orgs,
    writeBilling: res.write_billing,
  };
}

export function mapStaffPermissionsRequest(
  req: StaffPermissions,
): ApiStaffPermissions {
  return {
    read_all_orgs: req.readAllOrgs,
    write_billing: req.writeBilling,
  };
}

export function mapStaffMemberResponse(res: ApiStaffMember): StaffMember {
  return {
    userId: res.user_id,
    email: fromCandidOpt(res.email),
    emailVerified: res.email_verified,
    status: mapUserStatusResponse(res.status),
    permissions: mapStaffPermissionsResponse(res.permissions),
  };
}

export function mapListStaffResponse(
  res: ApiListStaffResponse,
): ListStaffResponse {
  return mapOkResponse(res).map(mapStaffMemberResponse);
}

export function mapGrantStaffPermissionsRequest(
  req: GrantStaffPermissionsRequest,
): ApiGrantStaffPermissionsRequest {
  return {
    user_id: req.userId,
    permissions: mapStaffPermissionsRequest(req.permissions),
  };
}

export function mapGrantStaffPermissionsResponse(
  res: ApiGrantStaffPermissionsResponse,
): void {
  mapOkResponse(res);
}

export function mapRevokeStaffPermissionsRequest(
  req: RevokeStaffPermissionsRequest,
): ApiRevokeStaffPermissionsRequest {
  return {
    user_id: req.userId,
  };
}

export function mapRevokeStaffPermissionsResponse(
  res: ApiRevokeStaffPermissionsResponse,
): void {
  mapOkResponse(res);
}
