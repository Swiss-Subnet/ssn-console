import { mapOkResponse } from '@/lib/api-models/error';
import type {
  Project as ApiProject,
  CreateProjectResponse as ApiCreateProjectResponse,
  ListMyProjectsResponse as ApiListMyProjectsResponse,
  CreateProjectRequest as ApiCreateProjectRequest,
} from '@ssn/backend-api';

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

export type CreateProjectResponse = {
  project: Project;
};

export function mapCreateProjectResponse(
  res: ApiCreateProjectResponse,
): CreateProjectResponse {
  const okRes = mapOkResponse(res);

  return {
    project: mapProjectResponse(okRes.project),
  };
}

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
