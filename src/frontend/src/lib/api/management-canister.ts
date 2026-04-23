import {
  mapCanisterStatusRequest,
  mapCanisterStatusResponse,
  mapUpdateSettingsRequest,
  mapStartCanisterRequest,
  mapStopCanisterRequest,
  mapDeleteCanisterRequest,
  type CanisterStatusRequest,
  type CanisterStatusResponse,
  type UpdateSettingsRequest,
  type StartCanisterRequest,
  type StopCanisterRequest,
  type DeleteCanisterRequest,
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

  public async startCanister(req: StartCanisterRequest): Promise<void> {
    const apiReq = mapStartCanisterRequest(req);

    await this.actor.start_canister.withOptions({
      effectiveCanisterId: apiReq.canister_id,
    })(apiReq);
  }

  public async stopCanister(req: StopCanisterRequest): Promise<void> {
    const apiReq = mapStopCanisterRequest(req);

    await this.actor.stop_canister.withOptions({
      effectiveCanisterId: apiReq.canister_id,
    })(apiReq);
  }

  public async deleteCanister(req: DeleteCanisterRequest): Promise<void> {
    const apiReq = mapDeleteCanisterRequest(req);

    await this.actor.delete_canister.withOptions({
      effectiveCanisterId: apiReq.canister_id,
    })(apiReq);
  }
}
