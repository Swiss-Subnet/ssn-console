import {
  mapListTeamsResponse,
  mapListOrgTeamsRequest,
  mapListOrgTeamsResponse,
  mapCreateTeamRequest,
  mapCreateTeamResponse,
  mapGetTeamRequest,
  mapGetTeamResponse,
  mapUpdateTeamRequest,
  mapUpdateTeamResponse,
  mapDeleteTeamRequest,
  mapDeleteTeamResponse,
  mapAddUserToTeamRequest,
  mapAddUserToTeamResponse,
  mapListTeamUsersRequest,
  mapListTeamUsersResponse,
  mapUpdateTeamOrgPermissionsRequest,
  mapUpdateTeamOrgPermissionsResponse,
  type ListTeamsResponse,
  type ListOrgTeamsRequest,
  type ListOrgTeamsResponse,
  type CreateTeamRequest,
  type TeamResponse,
  type GetTeamRequest,
  type UpdateTeamRequest,
  type DeleteTeamRequest,
  type AddUserToTeamRequest,
  type ListTeamUsersRequest,
  type TeamUser,
  type UpdateTeamOrgPermissionsRequest,
  type OrgTeamResponse,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class TeamApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listMyTeams(): Promise<ListTeamsResponse> {
    const res = await this.actor.list_my_teams();
    return mapListTeamsResponse(res);
  }

  public async listOrgTeams(
    req: ListOrgTeamsRequest,
  ): Promise<ListOrgTeamsResponse> {
    const res = await this.actor.list_org_teams(mapListOrgTeamsRequest(req));
    return mapListOrgTeamsResponse(res);
  }

  public async createTeam(req: CreateTeamRequest): Promise<TeamResponse> {
    const res = await this.actor.create_team(mapCreateTeamRequest(req));
    return mapCreateTeamResponse(res);
  }

  public async getTeam(req: GetTeamRequest): Promise<TeamResponse> {
    const res = await this.actor.get_team(mapGetTeamRequest(req));
    return mapGetTeamResponse(res);
  }

  public async updateTeam(req: UpdateTeamRequest): Promise<TeamResponse> {
    const res = await this.actor.update_team(mapUpdateTeamRequest(req));
    return mapUpdateTeamResponse(res);
  }

  public async deleteTeam(req: DeleteTeamRequest): Promise<void> {
    const res = await this.actor.delete_team(mapDeleteTeamRequest(req));
    mapDeleteTeamResponse(res);
  }

  public async addUserToTeam(req: AddUserToTeamRequest): Promise<void> {
    const res = await this.actor.add_user_to_team(mapAddUserToTeamRequest(req));
    mapAddUserToTeamResponse(res);
  }

  public async listTeamUsers(req: ListTeamUsersRequest): Promise<TeamUser[]> {
    const res = await this.actor.list_team_users(mapListTeamUsersRequest(req));
    return mapListTeamUsersResponse(res);
  }

  public async updateTeamOrgPermissions(
    req: UpdateTeamOrgPermissionsRequest,
  ): Promise<OrgTeamResponse> {
    const res = await this.actor.update_team_org_permissions(
      mapUpdateTeamOrgPermissionsRequest(req),
    );
    return mapUpdateTeamOrgPermissionsResponse(res);
  }
}
