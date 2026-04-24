import type { Team } from '@/lib/api-models';
import type { AppSlice, AppStateCreator, TeamsSlice } from '@/lib/store/model';
import { createSelector } from 'reselect';

export const createTeamsSlice: AppStateCreator<TeamsSlice> = (set, get) => ({
  isTeamsInitialized: false,
  teams: [],

  async initializeTeams() {
    const { teamApi, isAuthenticated } = get();

    if (!isAuthenticated) {
      set({ isTeamsInitialized: true });
      return;
    }

    try {
      const res = await teamApi.listMyTeams();
      set({ teams: res.teams });
    } finally {
      set({ isTeamsInitialized: true });
    }
  },

  clearTeams() {
    set({ teams: [] });
  },

  async loadOrgTeams(orgId: string) {
    const teamApi = get().teamApi;
    const res = await teamApi.listOrgTeams({ orgId });
    return res.teams;
  },

  async createTeam(orgId: string, name: string) {
    const teamApi = get().teamApi;
    const res = await teamApi.createTeam({ orgId, name });
    set(state => ({
      teams: [...state.teams, res.team],
    }));
    return res.team;
  },

  async updateTeam(teamId: string, name: string) {
    const teamApi = get().teamApi;
    const res = await teamApi.updateTeam({ teamId, name });
    set(state => ({
      teams: state.teams.map(t => (t.id === teamId ? res.team : t)),
    }));
    return res.team;
  },

  async deleteTeam(teamId: string) {
    const teamApi = get().teamApi;
    await teamApi.deleteTeam({ teamId });
    set(state => ({
      teams: state.teams.filter(t => t.id !== teamId),
    }));
  },

  async addUserToTeam(teamId: string, userId: string) {
    const teamApi = get().teamApi;
    await teamApi.addUserToTeam({ teamId, userId });
  },

  async loadTeamUsers(teamId: string) {
    return get().teamApi.listTeamUsers({ teamId });
  },

  async updateTeamOrgPermissions(teamId, permissions) {
    const res = await get().teamApi.updateTeamOrgPermissions({
      teamId,
      permissions,
    });
    return res.team;
  },
});

function selectTeams(state: AppSlice): Team[] {
  return state.teams;
}

export type TeamMap = Map<string, Team>;
export const selectTeamMap = createSelector(selectTeams, (teams): TeamMap => {
  return teams.reduce<TeamMap>((accum, team) => {
    accum.set(team.id, team);
    return accum;
  }, new Map());
});
