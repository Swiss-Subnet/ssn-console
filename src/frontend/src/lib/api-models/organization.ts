import { mapOkResponse } from '@/lib/api-models/error';
import type {
  ListMyOrganizationsResponse as ApiListMyOrganizationsResponse,
  CreateOrganizationRequest as ApiCreateOrganizationRequest,
  CreateOrganizationResponse as ApiCreateOrganizationResponse,
  GetOrganizationRequest as ApiGetOrganizationRequest,
  GetOrganizationResponse as ApiGetOrganizationResponse,
  UpdateOrganizationRequest as ApiUpdateOrganizationRequest,
  UpdateOrganizationResponse as ApiUpdateOrganizationResponse,
  DeleteOrganizationRequest as ApiDeleteOrganizationRequest,
  DeleteOrganizationResponse as ApiDeleteOrganizationResponse,
  Organization as ApiOrganization,
} from '@ssn/backend-api';

export type Organization = {
  id: string;
  name: string;
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
