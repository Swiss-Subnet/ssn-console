import { mapOkResponse } from '@/lib/api-models/error';
import type {
  Project as ApiProject,
  CreateProjectRequest as ApiCreateProjectRequest,
  CreateProjectResponse as ApiCreateProjectResponse,
  GetProjectRequest as ApiGetProjectRequest,
  GetProjectResponse as ApiGetProjectResponse,
  UpdateProjectRequest as ApiUpdateProjectRequest,
  UpdateProjectResponse as ApiUpdateProjectResponse,
  DeleteProjectRequest as ApiDeleteProjectRequest,
  DeleteProjectResponse as ApiDeleteProjectResponse,
  ListMyProjectsResponse as ApiListMyProjectsResponse,
  ListOrgProjectsRequest as ApiListOrgProjectsRequest,
  ListOrgProjectsResponse as ApiListOrgProjectsResponse,
  AddTeamToProjectRequest as ApiAddTeamToProjectRequest,
  AddTeamToProjectResponse as ApiAddTeamToProjectResponse,
  RemoveTeamFromProjectRequest as ApiRemoveTeamFromProjectRequest,
  RemoveTeamFromProjectResponse as ApiRemoveTeamFromProjectResponse,
  ListProjectTeamsRequest as ApiListProjectTeamsRequest,
} from '@ssn/backend-api';

export type Project = {
  id: string;
  orgId: string;
  name: string;
};

export function mapProjectResponse(res: ApiProject): Project {
  return {
    id: res.id,
    orgId: res.org_id,
    name: res.name,
  };
}

export type ListMyProjectsResponse = {
  projects: Project[];
};

export function mapListMyProjectsResponse(
  res: ApiListMyProjectsResponse,
): ListMyProjectsResponse {
  const okRes = mapOkResponse(res);
  return {
    projects: okRes.projects.map(mapProjectResponse),
  };
}

export type ListOrgProjectsRequest = {
  orgId: string;
};

export function mapListOrgProjectsRequest(
  req: ListOrgProjectsRequest,
): ApiListOrgProjectsRequest {
  return { org_id: req.orgId };
}

export type ListOrgProjectsResponse = {
  projects: Project[];
};

export function mapListOrgProjectsResponse(
  res: ApiListOrgProjectsResponse,
): ListOrgProjectsResponse {
  const okRes = mapOkResponse(res);
  return {
    projects: okRes.projects.map(mapProjectResponse),
  };
}

export type CreateProjectRequest = {
  orgId: string;
  name: string;
};

export function mapCreateProjectRequest(
  req: CreateProjectRequest,
): ApiCreateProjectRequest {
  return {
    name: req.name,
    org_id: req.orgId,
  };
}

export type ProjectResponse = {
  project: Project;
};

export type CreateProjectResponse = ProjectResponse;

export function mapCreateProjectResponse(
  res: ApiCreateProjectResponse,
): ProjectResponse {
  const okRes = mapOkResponse(res);
  return {
    project: mapProjectResponse(okRes.project),
  };
}

export type GetProjectRequest = {
  projectId: string;
};

export function mapGetProjectRequest(
  req: GetProjectRequest,
): ApiGetProjectRequest {
  return { project_id: req.projectId };
}

export function mapGetProjectResponse(
  res: ApiGetProjectResponse,
): ProjectResponse {
  const okRes = mapOkResponse(res);
  return {
    project: mapProjectResponse(okRes.project),
  };
}

export type UpdateProjectRequest = {
  projectId: string;
  name: string;
};

export function mapUpdateProjectRequest(
  req: UpdateProjectRequest,
): ApiUpdateProjectRequest {
  return { project_id: req.projectId, name: req.name };
}

export function mapUpdateProjectResponse(
  res: ApiUpdateProjectResponse,
): ProjectResponse {
  const okRes = mapOkResponse(res);
  return {
    project: mapProjectResponse(okRes.project),
  };
}

export type DeleteProjectRequest = {
  projectId: string;
};

export function mapDeleteProjectRequest(
  req: DeleteProjectRequest,
): ApiDeleteProjectRequest {
  return { project_id: req.projectId };
}

export function mapDeleteProjectResponse(res: ApiDeleteProjectResponse): void {
  mapOkResponse(res);
}

export type AddTeamToProjectRequest = {
  projectId: string;
  teamId: string;
};

export function mapAddTeamToProjectRequest(
  req: AddTeamToProjectRequest,
): ApiAddTeamToProjectRequest {
  return { project_id: req.projectId, team_id: req.teamId };
}

export function mapAddTeamToProjectResponse(
  res: ApiAddTeamToProjectResponse,
): void {
  mapOkResponse(res);
}

export type RemoveTeamFromProjectRequest = {
  projectId: string;
  teamId: string;
};

export function mapRemoveTeamFromProjectRequest(
  req: RemoveTeamFromProjectRequest,
): ApiRemoveTeamFromProjectRequest {
  return { project_id: req.projectId, team_id: req.teamId };
}

export function mapRemoveTeamFromProjectResponse(
  res: ApiRemoveTeamFromProjectResponse,
): void {
  mapOkResponse(res);
}

export type ListProjectTeamsRequest = {
  projectId: string;
};

export function mapListProjectTeamsRequest(
  req: ListProjectTeamsRequest,
): ApiListProjectTeamsRequest {
  return { project_id: req.projectId };
}
