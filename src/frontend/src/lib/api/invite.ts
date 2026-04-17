import {
  mapAcceptOrgInviteRequest,
  mapAcceptOrgInviteResponse,
  mapCreateOrgInviteRequest,
  mapCreateOrgInviteResponse,
  mapDeclineOrgInviteRequest,
  mapDeclineOrgInviteResponse,
  mapListMyInvitesResponse,
  mapListOrgInvitesRequest,
  mapListOrgInvitesResponse,
  mapRevokeOrgInviteRequest,
  mapRevokeOrgInviteResponse,
  type AcceptOrgInviteRequest,
  type CreateOrgInviteRequest,
  type DeclineOrgInviteRequest,
  type ListOrgInvitesRequest,
  type OrgInvite,
  type RevokeOrgInviteRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class InviteApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async createOrgInvite(
    req: CreateOrgInviteRequest,
  ): Promise<OrgInvite> {
    const res = await this.actor.create_org_invite(
      mapCreateOrgInviteRequest(req),
    );
    return mapCreateOrgInviteResponse(res);
  }

  public async listOrgInvites(
    req: ListOrgInvitesRequest,
  ): Promise<OrgInvite[]> {
    const res = await this.actor.list_org_invites(
      mapListOrgInvitesRequest(req),
    );
    return mapListOrgInvitesResponse(res);
  }

  public async revokeOrgInvite(req: RevokeOrgInviteRequest): Promise<void> {
    const res = await this.actor.revoke_org_invite(
      mapRevokeOrgInviteRequest(req),
    );
    mapRevokeOrgInviteResponse(res);
  }

  public async listMyInvites(): Promise<OrgInvite[]> {
    const res = await this.actor.list_my_invites();
    return mapListMyInvitesResponse(res);
  }

  public async acceptOrgInvite(req: AcceptOrgInviteRequest): Promise<void> {
    const res = await this.actor.accept_org_invite(
      mapAcceptOrgInviteRequest(req),
    );
    mapAcceptOrgInviteResponse(res);
  }

  public async declineOrgInvite(req: DeclineOrgInviteRequest): Promise<void> {
    const res = await this.actor.decline_org_invite(
      mapDeclineOrgInviteRequest(req),
    );
    mapDeclineOrgInviteResponse(res);
  }
}
