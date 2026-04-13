import {
  mapListCanisterChangesResponse,
  type ListCanisterChangesResponse,
} from '@/lib/api-models/canister-history';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { _SERVICE } from '@ssn/canister-history-api';

export class CanisterHistoryApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listCanisterChanges(
    canisterId: string,
  ): Promise<ListCanisterChangesResponse> {
    const res = await this.actor.list_canister_changes({
      canister_id: Principal.from(canisterId),
      reverse: [true],
      limit: [50n],
      page: [],
    });
    return mapListCanisterChangesResponse(res);
  }
}
