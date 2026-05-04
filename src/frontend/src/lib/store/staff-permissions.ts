import type { AppStateCreator, StaffSlice } from '@/lib/store/model';

export const createStaffSlice: AppStateCreator<StaffSlice> = (set, get) => ({
  isStaffInitialized: false,
  staff: null,

  async initializeStaff() {
    const { staffPermissionsApi, isAuthenticated, profile } = get();

    if (!isAuthenticated || !profile?.isAdmin) {
      set({ isStaffInitialized: true });
      return;
    }

    try {
      const staff = await staffPermissionsApi.listStaff();
      set({ staff });
    } finally {
      set({ isStaffInitialized: true });
    }
  },

  clearStaff() {
    set({ staff: null });
  },

  async grantStaffPermissions(userId, permissions) {
    const { staffPermissionsApi, isAuthenticated, profile } = get();

    if (!isAuthenticated || !profile?.isAdmin) {
      throw new Error('Not authorized to grant staff permissions');
    }

    await staffPermissionsApi.grantStaffPermissions({ userId, permissions });

    // Always refetch: the grant response carries no email/status, and the
    // local cache may be missing or stale (e.g. first visit to the page).
    const refreshed = await staffPermissionsApi.listStaff();
    set({ staff: refreshed });
  },

  async revokeStaffPermissions(userId) {
    const { staffPermissionsApi, isAuthenticated, profile } = get();

    if (!isAuthenticated || !profile?.isAdmin) {
      throw new Error('Not authorized to revoke staff permissions');
    }

    await staffPermissionsApi.revokeStaffPermissions({ userId });

    const { staff } = get();
    if (staff === null) {
      return;
    }

    set({ staff: staff.filter(member => member.userId !== userId) });
  },
});
