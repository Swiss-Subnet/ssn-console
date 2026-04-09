import { mapOkResponse } from '@/lib/api-models/error';
import type {
  ListTeamsResponse as ApiListTeamsResponse,
  ListOrgTeamsRequest as ApiListOrgTeamsRequest,
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
  Team as ApiTeam,
} from '@ssn/backend-api';

export type Team = {
  id: string;
  name: string;
};

export type ListTeamsResponse = {
  teams: Team[];
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

function mapTeamResponse(res: ApiTeam): Team {
  return {
    id: res.id,
    name: res.name,
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
