import {
  mapGetMyStaffPermissionsResponse,
  mapGrantStaffPermissionsRequest,
  mapGrantStaffPermissionsResponse,
  mapListStaffResponse,
  mapRevokeStaffPermissionsRequest,
  mapRevokeStaffPermissionsResponse,
  type GetMyStaffPermissionsResponse,
  type GrantStaffPermissionsRequest,
  type ListStaffResponse,
  type RevokeStaffPermissionsRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class StaffPermissionsApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listStaff(): Promise<ListStaffResponse> {
    const res = await this.actor.admin_list_staff({});
    return mapListStaffResponse(res);
  }

  public async getMyStaffPermissions(): Promise<GetMyStaffPermissionsResponse> {
    const res = await this.actor.get_my_staff_permissions({});
    return mapGetMyStaffPermissionsResponse(res);
  }

  public async grantStaffPermissions(
    req: GrantStaffPermissionsRequest,
  ): Promise<void> {
    const res = await this.actor.admin_grant_staff_permissions(
      mapGrantStaffPermissionsRequest(req),
    );
    mapGrantStaffPermissionsResponse(res);
  }

  public async revokeStaffPermissions(
    req: RevokeStaffPermissionsRequest,
  ): Promise<void> {
    const res = await this.actor.admin_revoke_staff_permissions(
      mapRevokeStaffPermissionsRequest(req),
    );
    mapRevokeStaffPermissionsResponse(res);
  }
}
