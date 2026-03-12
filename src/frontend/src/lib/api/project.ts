import {
  mapCreateProjectRequest,
  mapCreateProjectResponse,
  mapListMyProjectsResponse,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type ListMyProjectsResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class ProjectApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyProjects(): Promise<ListMyProjectsResponse> {
    const res = await this.actor.list_my_projects({});

    return mapListMyProjectsResponse(res);
  }

  public async createProject(
    req: CreateProjectRequest,
  ): Promise<CreateProjectResponse> {
    const res = await this.actor.create_project(mapCreateProjectRequest(req));

    return mapCreateProjectResponse(res);
  }
}
