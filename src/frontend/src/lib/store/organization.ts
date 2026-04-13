import type { Organization } from '@/lib/api-models';
import type {
  AppSlice,
  AppStateCreator,
  OrganizationsSlice,
} from '@/lib/store/model';
import { createSelector } from 'reselect';

export const createOrganizationsSlice: AppStateCreator<OrganizationsSlice> = (
  set,
  get,
) => ({
  isOrganizationsInitialized: false,
  organizations: [],

  async initializeOrganizations() {
    const { organizationApi, isAuthenticated } = get();

    if (!isAuthenticated) {
      set({ isOrganizationsInitialized: true });
      return;
    }

    try {
      const res = await organizationApi.listMyOrganizations();
      set({ organizations: res.organizations });
    } finally {
      set({ isOrganizationsInitialized: true });
    }
  },

  clearOrganizations() {
    set({ organizations: [] });
  },

  async createOrganization(name: string) {
    const organizationApi = get().organizationApi;
    const res = await organizationApi.createOrganization({ name });
    set(state => ({
      organizations: [...state.organizations, res.organization],
    }));
    await get().initializeProjects();
    return res.organization;
  },

  async updateOrganization(orgId: string, name: string) {
    const organizationApi = get().organizationApi;
    const res = await organizationApi.updateOrganization({ orgId, name });
    set(state => ({
      organizations: state.organizations.map(org =>
        org.id === orgId ? res.organization : org,
      ),
    }));
    return res.organization;
  },

  async deleteOrganization(orgId: string) {
    const organizationApi = get().organizationApi;
    await organizationApi.deleteOrganization({ orgId });
    set(state => ({
      organizations: state.organizations.filter(org => org.id !== orgId),
    }));
  },

  async loadOrgUsers(orgId: string) {
    return get().getOrganizationApi().listOrgUsers({ orgId });
  },
});

function selectOrgs(state: AppSlice): Organization[] {
  return state.organizations;
}

export type OrgMap = Map<string, Organization>;
export const selectOrgMap = createSelector(
  selectOrgs,
  (organizations): OrgMap => {
    return organizations.reduce<OrgMap>((accum, organization) => {
      accum.set(organization.id, organization);

      return accum;
    }, new Map());
  },
);
