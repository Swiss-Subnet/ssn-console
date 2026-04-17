import type { Project } from '@/lib/api-models';
import type {
  AppSlice,
  AppStateCreator,
  ProjectsSlice,
} from '@/lib/store/model';
import { selectOrgMap } from '@/lib/store/organization';
import { createSelector } from 'reselect';

export const createProjectsSlice: AppStateCreator<ProjectsSlice> = (
  set,
  get,
) => ({
  isProjectsInitialized: false,
  projects: [],

  async initializeProjects() {
    const { projectApi, isAuthenticated } = get();

    if (!isAuthenticated) {
      set({ isProjectsInitialized: true });
      return;
    }

    try {
      const res = await projectApi.listMyProjects();
      set({ projects: res.projects });
    } finally {
      set({ isProjectsInitialized: true });
    }
  },

  clearProjects() {
    set({ projects: [] });
  },

  async loadOrgProjects(orgId: string) {
    const { projectApi } = get();
    const res = await projectApi.listOrgProjects({ orgId });
    return res.projects;
  },

  async createProject(orgId: string, name: string) {
    const { projectApi } = get();
    const res = await projectApi.createProject({ orgId, name });
    set(state => ({
      projects: [...state.projects, res.project],
    }));
    return res.project;
  },

  async updateProject(projectId: string, name: string) {
    const { projectApi } = get();
    const res = await projectApi.updateProject({ projectId, name });
    set(state => ({
      projects: state.projects.map(p => (p.id === projectId ? res.project : p)),
    }));
    return res.project;
  },

  async deleteProject(projectId: string) {
    const { projectApi } = get();
    await projectApi.deleteProject({ projectId });
    set(state => ({
      projects: state.projects.filter(p => p.id !== projectId),
    }));
  },

  async loadProjectTeams(projectId: string) {
    const res = await get().projectApi.listProjectTeams({ projectId });
    return res.teams;
  },

  async addTeamToProject(projectId: string, teamId: string) {
    await get().projectApi.addTeamToProject({ projectId, teamId });
  },

  async removeTeamFromProject(projectId: string, teamId: string) {
    await get().projectApi.removeTeamFromProject({ projectId, teamId });
  },
});

function selectProjects(state: AppSlice): Project[] {
  return state.projects;
}

export type ProjectMap = Map<string, Project>;
export const selectProjectMap = createSelector(
  selectProjects,
  (projects): ProjectMap => {
    return projects.reduce<ProjectMap>((accum, project) => {
      accum.set(project.id, project);

      return accum;
    }, new Map());
  },
);

export type OrgWithProjects = { id: string; name: string; projects: Project[] };

export type OrgWithProjectsMap = Map<string, OrgWithProjects>;
export const selectOrgWithProjectsMap = createSelector(
  [selectOrgMap, selectProjects],
  (orgMap, projects): OrgWithProjectsMap => {
    if (orgMap.size <= 0) {
      return new Map();
    }

    return projects.reduce<OrgWithProjectsMap>((accum, project) => {
      const orgWithProjects: OrgWithProjects = accum.get(project.orgId) ?? {
        id: project.orgId,
        name: orgMap.get(project.orgId)?.name ?? '',
        projects: [],
      };

      orgWithProjects.projects.push(project);
      accum.set(project.orgId, orgWithProjects);

      return accum;
    }, new Map());
  },
);

export const selectOrgsWithProjects = createSelector(
  selectOrgWithProjectsMap,
  (orgWithProjectsMap): OrgWithProjects[] =>
    orgWithProjectsMap.values().toArray(),
);
