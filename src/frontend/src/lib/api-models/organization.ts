import { mapOkResponse } from '@/lib/api-models/error';
import type {
  ListMyOrganizationsResponse as ApiListMyOrganizationsResponse,
  Organization as ApiOrganization,
} from '@ssn/backend-api';

export type ListMyOrganizationsResponse = {
  organizations: Organization[];
};

export function mapListMyOrganizationsResponse(
  res: ApiListMyOrganizationsResponse,
): ListMyOrganizationsResponse {
  const okRes = mapOkResponse(res);

  return {
    organizations: okRes.map(mapOrganizationResponse),
  };
}

export type Organization = {
  id: string;
  name: string;
};

export function mapOrganizationResponse(res: ApiOrganization): Organization {
  return {
    id: res.id,
    name: res.name,
  };
}
