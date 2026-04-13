import {
  mapListMyCanistersResponse,
  mapListUserCanistersResponse,
  mapOkResponse,
  type ListMyCanistersResponse,
  type ListUserCanistersRequest,
  type ListUserCanistersResponse,
} from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { _SERVICE } from '@ssn/backend-api';

export class CanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyCanisters(): Promise<ListMyCanistersResponse> {
    const res = await this.actor.list_my_canisters();

    return mapListMyCanistersResponse(res);
  }

  public async listUserCanisters(
    request: ListUserCanistersRequest,
  ): Promise<ListUserCanistersResponse> {
    const res = await this.actor.list_user_canisters(request);

    return mapListUserCanistersResponse(res);
  }

  public async createCanister(): Promise<void> {
    const res = await this.actor.list_my_projects({});
    const [project] = mapOkResponse(res).projects;
    if (isNil(project)) {
      throw new Error('Default project not found');
    }

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
    const res = await this.actor.list_my_projects({});
    const [project] = mapOkResponse(res).projects;
    if (isNil(project)) {
      throw new Error('Default project not found');
    }

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
