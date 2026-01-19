import type {
  ListTrustedPartnersResponse as ApiListTrustedPartnersResponse,
  CreateTrustedPartnerRequest as ApiCreateTrustedPartnerRequest,
  CreateTrustedPartnerResponse as ApiCreateTrustedPartnerResponse,
  TrustedPartner as ApiTrustedPartner,
} from '@ssn/backend-api';

export type ListTrustedPartnersResponse = TrustedPartner[];

export type CreateTrustedPartnerRequest = {
  principal: string;
  name: string;
};

export type CreateTrustedPartnerResponse = TrustedPartner;

export type TrustedPartner = {
  id: string;
  principal: string;
  name: string;
};

export function mapListTrustedPartnersResponse(
  res: ApiListTrustedPartnersResponse,
): ListTrustedPartnersResponse {
  return res.map(mapTrustedPartnerResponse);
}

export function mapCreateTrustedPartnerRequest(
  req: CreateTrustedPartnerRequest,
): ApiCreateTrustedPartnerRequest {
  return {
    principal_id: req.principal,
    name: req.name,
  };
}

export function mapCreateTrustedPartnerResponse(
  res: ApiCreateTrustedPartnerResponse,
): CreateTrustedPartnerResponse {
  return mapTrustedPartnerResponse(res);
}

export function mapTrustedPartnerResponse(
  res: ApiTrustedPartner,
): TrustedPartner {
  return {
    id: res.id,
    principal: res.principal_id,
    name: res.name,
  };
}
