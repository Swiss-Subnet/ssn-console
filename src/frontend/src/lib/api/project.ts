// import { mapOkResponse } from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class ProjectApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyProjects(): Promise<void> {
    await this.actor.list_my_projects({});
    // const res = await this.actor.list_my_projects({});
    // const resBody = mapOkResponse(res);
  }
}
