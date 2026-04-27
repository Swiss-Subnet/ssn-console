import {
  mapListMyCanistersResponse,
  mapListUserCanistersResponse,
  mapOkResponse,
  readProposalOutcome,
  type ListMyCanistersRequest,
  type ListMyCanistersResponse,
  type ListUserCanistersRequest,
  type ListUserCanistersResponse,
  type ProposalOutcome,
} from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import { toCandidOpt } from '@/lib/utils';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { _SERVICE } from '@ssn/backend-api';

export class CanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyCanisters(
    request: ListMyCanistersRequest,
  ): Promise<ListMyCanistersResponse> {
    const res = await this.actor.list_my_canisters(request);

    return mapListMyCanistersResponse(res);
  }

  public async listUserCanisters(
    request: ListUserCanistersRequest,
  ): Promise<ListUserCanistersResponse> {
    const res = await this.actor.list_user_canisters(request);

    return mapListUserCanistersResponse(res);
  }

  public async createCanister(projectId: string): Promise<ProposalOutcome> {
    const createRes = await this.actor.create_proposal({
      project_id: projectId,
      operation: [
        {
          CreateCanister: {},
        },
      ],
    });
    return readProposalOutcome(mapOkResponse(createRes));
  }

  public async removeCanister(canisterId: string): Promise<void> {
    const res = await this.actor.remove_my_canister({
      canister_id: canisterId,
    });
    mapOkResponse(res);
  }

  public async updateCanisterName(
    canisterId: string,
    name: string | null,
  ): Promise<void> {
    const res = await this.actor.update_my_canister_name({
      canister_id: canisterId,
      name: toCandidOpt(name),
    });
    mapOkResponse(res);
  }

  public async addCanisterController(
    canisterId: string,
    controllerId: string,
  ): Promise<ProposalOutcome> {
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
    return readProposalOutcome(mapOkResponse(createRes));
  }
}
