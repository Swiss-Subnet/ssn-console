import { mapOkResponse } from '@/lib/api-models/error';
import {
  mapPlanTier,
  type PlanTier,
} from '@/lib/api-models/organization-billing-plan';
import {
  mapOrgPermissions,
  type OrgPermissions,
} from '@/lib/api-models/permissions';
import type {
  ListMyOrganizationsResponse as ApiListMyOrganizationsResponse,
  ListOrganizationsRequest as ApiListOrganizationsRequest,
  ListOrganizationsResponse as ApiListOrganizationsResponse,
  AdminOrganization as ApiAdminOrganization,
  CreateOrganizationRequest as ApiCreateOrganizationRequest,
  CreateOrganizationResponse as ApiCreateOrganizationResponse,
  GetOrganizationRequest as ApiGetOrganizationRequest,
  GetOrganizationResponse as ApiGetOrganizationResponse,
  UpdateOrganizationRequest as ApiUpdateOrganizationRequest,
  UpdateOrganizationResponse as ApiUpdateOrganizationResponse,
  DeleteOrganizationRequest as ApiDeleteOrganizationRequest,
  DeleteOrganizationResponse as ApiDeleteOrganizationResponse,
  ListOrgUsersRequest as ApiListOrgUsersRequest,
  ListOrgUsersResponse as ApiListOrgUsersResponse,
  Organization as ApiOrganization,
  OrgUser as ApiOrgUser,
} from '@ssn/backend-api';

export type Organization = {
  id: string;
  name: string;
  yourPermissions: OrgPermissions;
};

export type ListMyOrganizationsResponse = {
  organizations: Organization[];
};

export type CreateOrganizationRequest = {
  name: string;
};

export type OrganizationResponse = {
  organization: Organization;
};

export type GetOrganizationRequest = {
  orgId: string;
};

export type UpdateOrganizationRequest = {
  orgId: string;
  name: string;
};

export type DeleteOrganizationRequest = {
  orgId: string;
};

function mapOrganizationResponse(res: ApiOrganization): Organization {
  return {
    id: res.id,
    name: res.name,
    yourPermissions: mapOrgPermissions(res.your_permissions),
  };
}

export function mapListMyOrganizationsResponse(
  res: ApiListMyOrganizationsResponse,
): ListMyOrganizationsResponse {
  const okRes = mapOkResponse(res);

  return {
    organizations: okRes.map(mapOrganizationResponse),
  };
}

export type AdminOrganization = {
  id: string;
  name: string;
  tier: PlanTier;
  memberCount: number;
};

export type ListOrganizationsRequest = {
  after: string | null;
  limit: number | null;
};

export type ListOrganizationsResponse = {
  organizations: AdminOrganization[];
  nextCursor: string | null;
};

export function mapListOrganizationsRequest(
  req: ListOrganizationsRequest,
): ApiListOrganizationsRequest {
  return {
    after: req.after === null ? [] : [req.after],
    limit: req.limit === null ? [] : [req.limit],
  };
}

function mapAdminOrganization(org: ApiAdminOrganization): AdminOrganization {
  return {
    id: org.id,
    name: org.name,
    tier: mapPlanTier(org.tier),
    memberCount: org.member_count,
  };
}

export function mapListOrganizationsResponse(
  res: ApiListOrganizationsResponse,
): ListOrganizationsResponse {
  const ok = mapOkResponse(res);
  return {
    organizations: ok.organizations.map(mapAdminOrganization),
    nextCursor: ok.next_cursor[0] ?? null,
  };
}

export function mapCreateOrganizationRequest(
  req: CreateOrganizationRequest,
): ApiCreateOrganizationRequest {
  return { name: req.name };
}

export function mapCreateOrganizationResponse(
  res: ApiCreateOrganizationResponse,
): OrganizationResponse {
  const okRes = mapOkResponse(res);
  return { organization: mapOrganizationResponse(okRes.organization) };
}

export function mapGetOrganizationRequest(
  req: GetOrganizationRequest,
): ApiGetOrganizationRequest {
  return { org_id: req.orgId };
}

export function mapGetOrganizationResponse(
  res: ApiGetOrganizationResponse,
): OrganizationResponse {
  const okRes = mapOkResponse(res);
  return { organization: mapOrganizationResponse(okRes.organization) };
}

export function mapUpdateOrganizationRequest(
  req: UpdateOrganizationRequest,
): ApiUpdateOrganizationRequest {
  return { org_id: req.orgId, name: req.name };
}

export function mapUpdateOrganizationResponse(
  res: ApiUpdateOrganizationResponse,
): OrganizationResponse {
  const okRes = mapOkResponse(res);
  return { organization: mapOrganizationResponse(okRes.organization) };
}

export function mapDeleteOrganizationRequest(
  req: DeleteOrganizationRequest,
): ApiDeleteOrganizationRequest {
  return { org_id: req.orgId };
}

export function mapDeleteOrganizationResponse(
  res: ApiDeleteOrganizationResponse,
): void {
  mapOkResponse(res);
}

export type OrgUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  teams: { id: string; name: string }[];
  isOrgAdmin: boolean;
};

export type ListOrgUsersRequest = {
  orgId: string;
};

function mapOrgUserResponse(user: ApiOrgUser): OrgUser {
  return {
    id: user.id,
    email: user.email[0] ?? null,
    emailVerified: user.email_verified,
    teams: user.teams.map(t => ({ id: t.id, name: t.name })),
    isOrgAdmin: user.is_org_admin,
  };
}

export function mapListOrgUsersRequest(
  req: ListOrgUsersRequest,
): ApiListOrgUsersRequest {
  return { org_id: req.orgId };
}

export function mapListOrgUsersResponse(
  res: ApiListOrgUsersResponse,
): OrgUser[] {
  return mapOkResponse(res).map(mapOrgUserResponse);
}
