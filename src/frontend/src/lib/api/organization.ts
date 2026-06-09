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
  mapListOrgUsersRequest,
  mapListOrgUsersResponse,
  mapListOrganizationsRequest,
  mapListOrganizationsResponse,
  mapGetOrgBillingPlanRequest,
  mapGetOrgBillingPlanResponse,
  mapListMyOrgBillingPlansResponse,
  mapSetOrgBillingPlanRequest,
  mapSetOrgBillingPlanResponse,
  type ListMyOrganizationsResponse,
  type ListOrganizationsRequest,
  type ListOrganizationsResponse,
  type CreateOrganizationRequest,
  type OrganizationResponse,
  type GetOrganizationRequest,
  type UpdateOrganizationRequest,
  type DeleteOrganizationRequest,
  type ListOrgUsersRequest,
  type OrgUser,
  type GetOrgBillingPlanRequest,
  type MyOrgBillingPlan,
  type OrgBillingPlan,
  type SetOrgBillingPlanRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class OrganizationApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyOrganizations(): Promise<ListMyOrganizationsResponse> {
    const res = await this.actor.list_my_organizations();
    return mapListMyOrganizationsResponse(res);
  }

  public async listOrganizations(
    req: ListOrganizationsRequest,
  ): Promise<ListOrganizationsResponse> {
    const res = await this.actor.admin_list_organizations(
      mapListOrganizationsRequest(req),
    );
    return mapListOrganizationsResponse(res);
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

  public async deleteOrganization(
    req: DeleteOrganizationRequest,
  ): Promise<void> {
    const res = await this.actor.delete_organization(
      mapDeleteOrganizationRequest(req),
    );
    mapDeleteOrganizationResponse(res);
  }

  public async listOrgUsers(req: ListOrgUsersRequest): Promise<OrgUser[]> {
    const res = await this.actor.list_org_users(mapListOrgUsersRequest(req));
    return mapListOrgUsersResponse(res);
  }

  public async getOrgBillingPlan(
    req: GetOrgBillingPlanRequest,
  ): Promise<OrgBillingPlan> {
    const res = await this.actor.get_org_billing_plan(
      mapGetOrgBillingPlanRequest(req),
    );
    return mapGetOrgBillingPlanResponse(res);
  }

  public async setOrgBillingPlan(req: SetOrgBillingPlanRequest): Promise<void> {
    const res = await this.actor.admin_set_org_billing_plan(
      mapSetOrgBillingPlanRequest(req),
    );
    mapSetOrgBillingPlanResponse(res);
  }

  public async listMyOrgBillingPlans(): Promise<MyOrgBillingPlan[]> {
    const res = await this.actor.list_my_org_billing_plans();
    return mapListMyOrgBillingPlansResponse(res);
  }
}
