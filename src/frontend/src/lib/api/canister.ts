import {
  mapCreateCanisterResponse,
  mapListCanistersResponse,
  mapListMyCanistersResponse,
  type CreateCanisterResponse,
  type ListCanistersResponse,
  type ListMyCanistersResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class CanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listCanisters(): Promise<ListCanistersResponse> {
    const res = await this.actor.list_canisters();

    return mapListCanistersResponse(res);
  }

  public async listMyCanisters(): Promise<ListMyCanistersResponse> {
    const res = await this.actor.list_my_canisters();

    return mapListMyCanistersResponse(res);
  }

  public async createCanister(): Promise<CreateCanisterResponse> {
    const res = await this.actor.create_canister();

    return mapCreateCanisterResponse(res);
  }
}
