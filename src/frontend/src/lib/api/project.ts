import {
  mapAddTeamToProjectRequest,
  mapAddTeamToProjectResponse,
  mapCreateProjectRequest,
  mapCreateProjectResponse,
  mapDeleteProjectRequest,
  mapDeleteProjectResponse,
  mapGetProjectRequest,
  mapGetProjectResponse,
  mapListMyProjectsResponse,
  mapListOrgProjectsRequest,
  mapListOrgProjectsResponse,
  mapListProjectTeamsRequest,
  mapListProjectTeamsResponse,
  mapRemoveTeamFromProjectRequest,
  mapRemoveTeamFromProjectResponse,
  mapUpdateProjectRequest,
  mapUpdateProjectResponse,
  mapUpdateTeamProjectPermissionsRequest,
  mapUpdateTeamProjectPermissionsResponse,
  type AddTeamToProjectRequest,
  type CreateProjectRequest,
  type DeleteProjectRequest,
  type GetProjectRequest,
  type ListMyProjectsResponse,
  type ListOrgProjectsRequest,
  type ListOrgProjectsResponse,
  type ListProjectTeamsRequest,
  type ListProjectTeamsResponse,
  type ProjectResponse,
  type ProjectTeamResponse,
  type RemoveTeamFromProjectRequest,
  type UpdateProjectRequest,
  type UpdateTeamProjectPermissionsRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class ProjectApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyProjects(): Promise<ListMyProjectsResponse> {
    const res = await this.actor.list_my_projects({});
    return mapListMyProjectsResponse(res);
  }

  public async listOrgProjects(
    req: ListOrgProjectsRequest,
  ): Promise<ListOrgProjectsResponse> {
    const res = await this.actor.list_org_projects(
      mapListOrgProjectsRequest(req),
    );
    return mapListOrgProjectsResponse(res);
  }

  public async createProject(
    req: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    const res = await this.actor.create_project(mapCreateProjectRequest(req));
    return mapCreateProjectResponse(res);
  }

  public async getProject(req: GetProjectRequest): Promise<ProjectResponse> {
    const res = await this.actor.get_project(mapGetProjectRequest(req));
    return mapGetProjectResponse(res);
  }

  public async updateProject(
    req: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    const res = await this.actor.update_project(mapUpdateProjectRequest(req));
    return mapUpdateProjectResponse(res);
  }

  public async deleteProject(req: DeleteProjectRequest): Promise<void> {
    const res = await this.actor.delete_project(mapDeleteProjectRequest(req));
    mapDeleteProjectResponse(res);
  }

  public async listProjectTeams(
    req: ListProjectTeamsRequest,
  ): Promise<ListProjectTeamsResponse> {
    const res = await this.actor.list_project_teams(
      mapListProjectTeamsRequest(req),
    );
    return mapListProjectTeamsResponse(res);
  }

  public async addTeamToProject(req: AddTeamToProjectRequest): Promise<void> {
    const res = await this.actor.add_team_to_project(
      mapAddTeamToProjectRequest(req),
    );
    mapAddTeamToProjectResponse(res);
  }

  public async removeTeamFromProject(
    req: RemoveTeamFromProjectRequest,
  ): Promise<void> {
    const res = await this.actor.remove_team_from_project(
      mapRemoveTeamFromProjectRequest(req),
    );
    mapRemoveTeamFromProjectResponse(res);
  }

  public async updateTeamProjectPermissions(
    req: UpdateTeamProjectPermissionsRequest,
  ): Promise<ProjectTeamResponse> {
    const res = await this.actor.update_team_project_permissions(
      mapUpdateTeamProjectPermissionsRequest(req),
    );
    return mapUpdateTeamProjectPermissionsResponse(res);
  }
}
