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
