import { mapOkResponse } from '@/lib/api-models/error';
import {
  mapOrgPermissions,
  mapOrgPermissionsToApi,
  mapProjectPermissions,
  type OrgPermissions,
  type ProjectPermissions,
} from '@/lib/api-models/permissions';
import type {
  ListTeamsResponse as ApiListTeamsResponse,
  ListOrgTeamsRequest as ApiListOrgTeamsRequest,
  ListOrgTeamsResponse as ApiListOrgTeamsResponse,
  ListProjectTeamsResponse as ApiListProjectTeamsResponse,
  CreateTeamRequest as ApiCreateTeamRequest,
  CreateTeamResponse as ApiCreateTeamResponse,
  GetTeamRequest as ApiGetTeamRequest,
  GetTeamResponse as ApiGetTeamResponse,
  UpdateTeamRequest as ApiUpdateTeamRequest,
  UpdateTeamResponse as ApiUpdateTeamResponse,
  DeleteTeamRequest as ApiDeleteTeamRequest,
  DeleteTeamResponse as ApiDeleteTeamResponse,
  AddUserToTeamRequest as ApiAddUserToTeamRequest,
  AddUserToTeamResponse as ApiAddUserToTeamResponse,
  ListTeamUsersRequest as ApiListTeamUsersRequest,
  ListTeamUsersResponse as ApiListTeamUsersResponse,
  Team as ApiTeam,
  OrgTeam as ApiOrgTeam,
  ProjectTeam as ApiProjectTeam,
  TeamUser as ApiTeamUser,
  UpdateTeamOrgPermissionsRequest as ApiUpdateTeamOrgPermissionsRequest,
  UpdateTeamOrgPermissionsResponse as ApiUpdateTeamOrgPermissionsResponse,
} from '@ssn/backend-api';

export type Team = {
  id: string;
  name: string;
};

export type OrgTeam = {
  id: string;
  name: string;
  permissions: OrgPermissions;
};

export type ProjectTeam = {
  id: string;
  name: string;
  permissions: ProjectPermissions;
};

export type ListTeamsResponse = {
  teams: Team[];
};

export type ListOrgTeamsResponse = {
  teams: OrgTeam[];
};

export type ListProjectTeamsResponse = {
  teams: ProjectTeam[];
};

export type ListOrgTeamsRequest = {
  orgId: string;
};

export type CreateTeamRequest = {
  orgId: string;
  name: string;
};

export type TeamResponse = {
  team: Team;
};

export type GetTeamRequest = {
  teamId: string;
};

export type UpdateTeamRequest = {
  teamId: string;
  name: string;
};

export type DeleteTeamRequest = {
  teamId: string;
};

export type AddUserToTeamRequest = {
  teamId: string;
  userId: string;
};

export type UpdateTeamOrgPermissionsRequest = {
  teamId: string;
  permissions: OrgPermissions;
};

export type OrgTeamResponse = {
  team: OrgTeam;
};

function mapTeamResponse(res: ApiTeam): Team {
  return {
    id: res.id,
    name: res.name,
  };
}

export function mapOrgTeamResponse(res: ApiOrgTeam): OrgTeam {
  return {
    id: res.id,
    name: res.name,
    permissions: mapOrgPermissions(res.permissions),
  };
}

export function mapProjectTeamResponse(res: ApiProjectTeam): ProjectTeam {
  return {
    id: res.id,
    name: res.name,
    permissions: mapProjectPermissions(res.permissions),
  };
}

export function mapListTeamsResponse(
  res: ApiListTeamsResponse,
): ListTeamsResponse {
  const okRes = mapOkResponse(res);
  return {
    teams: okRes.map(mapTeamResponse),
  };
}

export function mapListOrgTeamsResponse(
  res: ApiListOrgTeamsResponse,
): ListOrgTeamsResponse {
  const okRes = mapOkResponse(res);
  return {
    teams: okRes.map(mapOrgTeamResponse),
  };
}

export function mapListProjectTeamsResponse(
  res: ApiListProjectTeamsResponse,
): ListProjectTeamsResponse {
  const okRes = mapOkResponse(res);
  return {
    teams: okRes.map(mapProjectTeamResponse),
  };
}

export function mapListOrgTeamsRequest(
  req: ListOrgTeamsRequest,
): ApiListOrgTeamsRequest {
  return { org_id: req.orgId };
}

export function mapCreateTeamRequest(
  req: CreateTeamRequest,
): ApiCreateTeamRequest {
  return { org_id: req.orgId, name: req.name };
}

export function mapCreateTeamResponse(
  res: ApiCreateTeamResponse,
): TeamResponse {
  const okRes = mapOkResponse(res);
  return { team: mapTeamResponse(okRes.team) };
}

export function mapGetTeamRequest(req: GetTeamRequest): ApiGetTeamRequest {
  return { team_id: req.teamId };
}

export function mapGetTeamResponse(res: ApiGetTeamResponse): TeamResponse {
  const okRes = mapOkResponse(res);
  return { team: mapTeamResponse(okRes.team) };
}

export function mapUpdateTeamRequest(
  req: UpdateTeamRequest,
): ApiUpdateTeamRequest {
  return { team_id: req.teamId, name: req.name };
}

export function mapUpdateTeamResponse(
  res: ApiUpdateTeamResponse,
): TeamResponse {
  const okRes = mapOkResponse(res);
  return { team: mapTeamResponse(okRes.team) };
}

export function mapDeleteTeamRequest(
  req: DeleteTeamRequest,
): ApiDeleteTeamRequest {
  return { team_id: req.teamId };
}

export function mapDeleteTeamResponse(res: ApiDeleteTeamResponse): void {
  mapOkResponse(res);
}

export function mapAddUserToTeamRequest(
  req: AddUserToTeamRequest,
): ApiAddUserToTeamRequest {
  return { team_id: req.teamId, user_id: req.userId };
}

export function mapAddUserToTeamResponse(res: ApiAddUserToTeamResponse): void {
  mapOkResponse(res);
}

export function mapUpdateTeamOrgPermissionsRequest(
  req: UpdateTeamOrgPermissionsRequest,
): ApiUpdateTeamOrgPermissionsRequest {
  return {
    team_id: req.teamId,
    permissions: mapOrgPermissionsToApi(req.permissions),
  };
}

export function mapUpdateTeamOrgPermissionsResponse(
  res: ApiUpdateTeamOrgPermissionsResponse,
): OrgTeamResponse {
  const okRes = mapOkResponse(res);
  return { team: mapOrgTeamResponse(okRes.team) };
}

export type TeamUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
};

export type ListTeamUsersRequest = {
  teamId: string;
};

function mapTeamUser(user: ApiTeamUser): TeamUser {
  return {
    id: user.id,
    email: user.email[0] ?? null,
    emailVerified: user.email_verified,
  };
}

export function mapListTeamUsersRequest(
  req: ListTeamUsersRequest,
): ApiListTeamUsersRequest {
  return { team_id: req.teamId };
}

export function mapListTeamUsersResponse(
  res: ApiListTeamUsersResponse,
): TeamUser[] {
  return mapOkResponse(res).map(mapTeamUser);
}
