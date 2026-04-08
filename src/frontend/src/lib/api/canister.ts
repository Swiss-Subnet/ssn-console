import {
  mapListProjectCanistersResponse,
  mapOkResponse,
  type ListProjectCanistersResponse,
} from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { _SERVICE, Proposal } from '@ssn/backend-api';

function assertProposalExecuted(proposal: Proposal): void {
  const [status] = proposal.status;
  if (isNil(status)) {
    throw new Error('Proposal returned without a status');
  }
  if ('Failed' in status) {
    throw new Error(status.Failed.message);
  }
  if ('Rejected' in status) {
    throw new Error('Proposal was rejected');
  }
}

export class CanisterApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listProjectCanisters(
    projectId: string,
  ): Promise<ListProjectCanistersResponse> {
    const res = await this.actor.list_project_canisters({
      project_id: projectId,
      // [TODO]: add pagination in follow-up PR
      limit: [50n],
      page: [1n],
    });

    return mapListProjectCanistersResponse(res);
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
    assertProposalExecuted(mapOkResponse(createRes));
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
    assertProposalExecuted(mapOkResponse(createRes));
  }
}
