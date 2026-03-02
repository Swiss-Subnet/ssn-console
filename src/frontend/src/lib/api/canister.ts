import {
  mapListMyCanistersResponse,
  mapOkResponse,
  type ListMyCanistersResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { _SERVICE } from '@ssn/backend-api';

export class CanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyCanisters(): Promise<ListMyCanistersResponse> {
    const res = await this.actor.list_my_canisters();

    return mapListMyCanistersResponse(res);
  }

  public async createCanister(): Promise<void> {
    const listRes = await this.actor.list_my_projects();
    const [project] = mapOkResponse(listRes);

    const createRes = await this.actor.create_proposal({
      project_id: project.id,
      operation: [
        {
          CreateCanister: {},
        },
      ],
    });
    mapOkResponse(createRes);
  }

  public async addCanisterController(
    canisterId: string,
    controllerId: string,
  ): Promise<void> {
    const listRes = await this.actor.list_my_projects();
    const [project] = mapOkResponse(listRes);

    const createRes = await this.actor.create_proposal({
      project_id: project.id,
      operation: [
        {
          AddCanisterController: {
            canister_id: Principal.from(canisterId),
            controller_id: Principal.from(controllerId),
          },
        },
      ],
    });
    mapOkResponse(createRes);
  }
}
