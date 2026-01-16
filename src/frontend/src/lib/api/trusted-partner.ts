import {
  mapCreateTrustedPartnerRequest,
  mapCreateTrustedPartnerResponse,
  mapListTrustedPartnersResponse,
  type CreateTrustedPartnerRequest,
  type CreateTrustedPartnerResponse,
  type ListTrustedPartnersResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class TrustedPartnerApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listTrustedPartners(): Promise<ListTrustedPartnersResponse> {
    const res = await this.actor.list_trusted_partners();

    return mapListTrustedPartnersResponse(res);
  }

  public async createTrustedPartner(
    req: CreateTrustedPartnerRequest,
  ): Promise<CreateTrustedPartnerResponse> {
    const apiReq = mapCreateTrustedPartnerRequest(req);

    const apiRes = await this.actor.create_trusted_partner(apiReq);

    return mapCreateTrustedPartnerResponse(apiRes);
  }
}
