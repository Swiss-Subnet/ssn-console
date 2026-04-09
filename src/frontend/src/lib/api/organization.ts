import {
  mapListMyOrganizationsResponse,
  mapCreateOrganizationRequest,
  mapCreateOrganizationResponse,
  mapGetOrganizationRequest,
  mapGetOrganizationResponse,
  mapUpdateOrganizationRequest,
  mapUpdateOrganizationResponse,
  mapDeleteOrganizationRequest,
  mapDeleteOrganizationResponse,
  type ListMyOrganizationsResponse,
  type CreateOrganizationRequest,
  type OrganizationResponse,
  type GetOrganizationRequest,
  type UpdateOrganizationRequest,
  type DeleteOrganizationRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class OrganizationApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyOrganizations(): Promise<ListMyOrganizationsResponse> {
    const res = await this.actor.list_my_organizations();
    return mapListMyOrganizationsResponse(res);
  }

  public async createOrganization(
    req: CreateOrganizationRequest,
  ): Promise<OrganizationResponse> {
    const res = await this.actor.create_organization(
      mapCreateOrganizationRequest(req),
    );
    return mapCreateOrganizationResponse(res);
  }

  public async getOrganization(
    req: GetOrganizationRequest,
  ): Promise<OrganizationResponse> {
    const res = await this.actor.get_organization(
      mapGetOrganizationRequest(req),
    );
    return mapGetOrganizationResponse(res);
  }

  public async updateOrganization(
    req: UpdateOrganizationRequest,
  ): Promise<OrganizationResponse> {
    const res = await this.actor.update_organization(
      mapUpdateOrganizationRequest(req),
    );
    return mapUpdateOrganizationResponse(res);
  }

  public async deleteOrganization(req: DeleteOrganizationRequest): Promise<void> {
    const res = await this.actor.delete_organization(
      mapDeleteOrganizationRequest(req),
    );
    mapDeleteOrganizationResponse(res);
  }
}
