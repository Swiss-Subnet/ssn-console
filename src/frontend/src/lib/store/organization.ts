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
