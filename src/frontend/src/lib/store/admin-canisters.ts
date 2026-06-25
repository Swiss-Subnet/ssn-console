import type { CanisterWithOwner } from '@/lib/api-models';
import type { AdminCanistersSlice, AppStateCreator } from '@/lib/store/model';
import { selectCanReadAllOrgs } from '@/lib/store/user-profile';

const PAGE_SIZE = 50n;

export type AdminCanisterRow = CanisterWithOwner & {
  tracked: boolean;
};

export const createAdminCanistersSlice: AppStateCreator<AdminCanistersSlice> = (
  set,
  get,
) => ({
  isAdminCanistersInitialized: false,
  isAdminCanistersLoading: false,
  adminCanisters: null,
  adminUntrackedCount: 0,

  async initializeAdminCanisters() {
    const state = get();
    const { canisterApi, canisterHistoryApi, isAuthenticated } = state;

    if (!isAuthenticated || !selectCanReadAllOrgs(state)) {
      set({ isAdminCanistersInitialized: true });
      return;
    }

    set({ isAdminCanistersLoading: true });
    try {
      // Tracked: every canister registered in the backend (paginated).
      const tracked: CanisterWithOwner[] = [];
      let page = 1n;
      for (;;) {
        const res = await canisterApi.adminListAllCanisters(page, PAGE_SIZE);
        tracked.push(...res.canisters);
        if (page >= res.totalPages) break;
        page += 1n;
      }

      // Known: every canister canister-history has seen on the subnet
      // (excluding ones it has since observed as deleted).
      const known = await canisterHistoryApi.listKnownCanisters();

      const trackedPrincipals = new Set(tracked.map(c => c.principal));
      const rows: AdminCanisterRow[] = tracked.map(c => ({
        ...c,
        tracked: true,
      }));

      let untrackedCount = 0;
      for (const k of known) {
        if (k.isDeleted || trackedPrincipals.has(k.canisterId)) continue;
        untrackedCount += 1;
        rows.push({
          id: k.canisterId,
          principal: k.canisterId,
          userId: '',
          email: null,
          emailVerified: false,
          deletedAt: null,
          tracked: false,
        });
      }

      set({
        adminCanisters: rows,
        adminUntrackedCount: untrackedCount,
      });
    } finally {
      set({
        isAdminCanistersInitialized: true,
        isAdminCanistersLoading: false,
      });
    }
  },

  clearAdminCanisters() {
    set({
      adminCanisters: null,
      adminUntrackedCount: 0,
      isAdminCanistersInitialized: false,
    });
  },
});
