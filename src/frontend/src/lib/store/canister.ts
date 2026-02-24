import { BACKEND_CANISTER_ID } from '@/env';
import type { AppStateCreator, CanistersSlice } from '@/lib/store/model';

export const createCanistersSlice: AppStateCreator<CanistersSlice> = (
  set,
  get,
) => ({
  isCanistersInitialized: false,
  isCanistersLoading: false,
  canisters: null,

  async initializeCanisters() {
    const { isAuthenticated, refreshCanisters } = get();

    if (!isAuthenticated) {
      set({ isCanistersInitialized: true });
      return;
    }

    try {
      await refreshCanisters();
    } finally {
      set({ isCanistersInitialized: true });
    }
  },

  async refreshCanisters() {
    const { getCanisterApi } = get();
    const canisterApi = getCanisterApi();

    set({ isCanistersLoading: true });
    try {
      const canisters = await canisterApi.listMyCanisters();
      set({ canisters });
    } finally {
      set({ isCanistersLoading: false });
    }
  },

  clearCanisters() {
    set({ canisters: null });
  },

  async createCanister() {
    const { getCanisterApi, refreshCanisters } = get();
    const canisterApi = getCanisterApi();

    await canisterApi.createCanister();
    await refreshCanisters();
  },

  async addMissingController(canisterId) {
    const { getManagementCanisterApi, refreshCanisters } = get();
    const managementCanisterApi = getManagementCanisterApi();

    const canisterSettings = await managementCanisterApi.getCanisterStatus({
      canisterId,
    });
    await managementCanisterApi.updateSettings({
      canisterId,
      settings: {
        controllers: [
          ...canisterSettings.settings.controllers,
          BACKEND_CANISTER_ID,
        ],
      },
    });
    await refreshCanisters();
  },

  async addController(canisterId, controllerId) {
    const { getCanisterApi, refreshCanisters } = get();
    const canisterApi = getCanisterApi();

    await canisterApi.addCanisterController(canisterId, controllerId);
    await refreshCanisters();
  },
});
