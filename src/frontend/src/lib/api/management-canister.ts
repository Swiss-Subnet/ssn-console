import {
  mapCanisterStatusRequest,
  mapCanisterStatusResponse,
  mapUpdateSettingsRequest,
  type CanisterStatusRequest,
  type CanisterStatusResponse,
  type UpdateSettingsRequest,
} from '@/lib/api-models';
import { type ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/management-canister';

export class ManagementCanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async getCanisterStatus(
    req: CanisterStatusRequest,
  ): Promise<CanisterStatusResponse> {
    const apiReq = mapCanisterStatusRequest(req);

    const apiRes = await this.actor.canister_status.withOptions({
      effectiveCanisterId: apiReq.canister_id,
    })(apiReq);

    return mapCanisterStatusResponse(apiRes);
  }

  public async updateSettings(req: UpdateSettingsRequest): Promise<void> {
    const apiReq = mapUpdateSettingsRequest(req);

    await this.actor.update_settings.withOptions({
      effectiveCanisterId: apiReq.canister_id,
    })(apiReq);
  }
}
