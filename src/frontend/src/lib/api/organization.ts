import {
  mapListMyOrganizationsResponse,
  type ListMyOrganizationsResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class OrganizationApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyOrganizations(): Promise<ListMyOrganizationsResponse> {
    const res = await this.actor.list_my_organizations();

    return mapListMyOrganizationsResponse(res);
  }
}
