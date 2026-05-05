import {
  mapGrantStaffPermissionsRequest,
  mapGrantStaffPermissionsResponse,
  mapListStaffResponse,
  mapRevokeStaffPermissionsRequest,
  mapRevokeStaffPermissionsResponse,
  type GrantStaffPermissionsRequest,
  type ListStaffResponse,
  type RevokeStaffPermissionsRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class StaffPermissionsApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listStaff(): Promise<ListStaffResponse> {
    const res = await this.actor.list_staff({});
    return mapListStaffResponse(res);
  }

  public async grantStaffPermissions(
    req: GrantStaffPermissionsRequest,
  ): Promise<void> {
    const res = await this.actor.grant_staff_permissions(
      mapGrantStaffPermissionsRequest(req),
    );
    mapGrantStaffPermissionsResponse(res);
  }

  public async revokeStaffPermissions(
    req: RevokeStaffPermissionsRequest,
  ): Promise<void> {
    const res = await this.actor.revoke_staff_permissions(
      mapRevokeStaffPermissionsRequest(req),
    );
    mapRevokeStaffPermissionsResponse(res);
  }
}
