import type { PlanTier } from '@/lib/api-models';
import type { AdminOrgsSlice, AppStateCreator } from '@/lib/store/model';
import {
  selectCanReadAllOrgs,
  selectCanWriteBilling,
} from '@/lib/store/user-profile';

const PAGE_SIZE = 50;

export const createAdminOrgsSlice: AppStateCreator<AdminOrgsSlice> = (
  set,
  get,
) => ({
  isAdminOrgsInitialized: false,
  adminOrgs: null,
  adminOrgsNextCursor: null,

  async initializeAdminOrgs() {
    const state = get();
    const { organizationApi, isAuthenticated } = state;

    if (!isAuthenticated || !selectCanReadAllOrgs(state)) {
      set({ isAdminOrgsInitialized: true });
      return;
    }

    try {
      const res = await organizationApi.listOrganizations({
        after: null,
        limit: PAGE_SIZE,
      });
      set({
        adminOrgs: res.organizations,
        adminOrgsNextCursor: res.nextCursor,
      });
    } finally {
      set({ isAdminOrgsInitialized: true });
    }
  },

  async loadMoreAdminOrgs() {
    const { organizationApi, adminOrgs, adminOrgsNextCursor } = get();
    if (adminOrgsNextCursor === null) {
      return;
    }

    const res = await organizationApi.listOrganizations({
      after: adminOrgsNextCursor,
      limit: PAGE_SIZE,
    });
    set({
      adminOrgs: [...(adminOrgs ?? []), ...res.organizations],
      adminOrgsNextCursor: res.nextCursor,
    });
  },

  clearAdminOrgs() {
    set({ adminOrgs: null, adminOrgsNextCursor: null });
  },

  async setAdminOrgPlan(orgId: string, tier: PlanTier) {
    const state = get();
    const { organizationApi, isAuthenticated } = state;

    if (!isAuthenticated || !selectCanWriteBilling(state)) {
      throw new Error('Not authorized to change billing plans');
    }

    await organizationApi.setOrgBillingPlan({ orgId, tier });

    const { adminOrgs } = get();
    if (adminOrgs === null) {
      return;
    }
    set({
      adminOrgs: adminOrgs.map(org =>
        org.id === orgId ? { ...org, tier } : org,
      ),
    });
  },
});
