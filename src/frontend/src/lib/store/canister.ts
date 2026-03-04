import { BACKEND_CANISTER_ID } from '@/env';
import type { Canister } from '@/lib/api-models';
import type {
  AppSlice,
  AppStateCreator,
  CanistersSlice,
} from '@/lib/store/model';
import { createSelector } from 'reselect';

export const createCanistersSlice: AppStateCreator<CanistersSlice> = (
  set,
  get,
) => ({
  isCanistersInitialized: false,
  isCanistersLoading: false,
  canisters: null,

  async initializeCanisters(projectId) {
    const { isAuthenticated, refreshCanisters } = get();

    if (!isAuthenticated) {
      set({ isCanistersInitialized: true });
      return;
    }

    try {
      await refreshCanisters(projectId);
    } finally {
      set({ isCanistersInitialized: true });
    }
  },

  async refreshCanisters(projectId) {
    const { getCanisterApi } = get();
    const canisterApi = getCanisterApi();

    set({ isCanistersLoading: true });
    try {
      const canisters = await canisterApi.listMyCanisters();
      set(state => {
        const newCanisters = state.canisters
          ? new Map(state.canisters)
          : new Map();
        newCanisters.set(projectId, canisters);

        return { canisters: newCanisters };
      });
    } finally {
      set({ isCanistersLoading: false });
    }
  },

  clearCanisters() {
    set({ canisters: null });
  },

  async createCanister(projectId) {
    const { getCanisterApi, refreshCanisters } = get();
    const canisterApi = getCanisterApi();

    await canisterApi.createCanister();
    await refreshCanisters(projectId);
  },

  async addMissingController(canisterId, projectId) {
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
    await refreshCanisters(projectId);
  },

  async addController(canisterId, controllerId, projectId) {
    const { getCanisterApi, refreshCanisters } = get();
    const canisterApi = getCanisterApi();

    await canisterApi.addCanisterController(canisterId, controllerId);
    await refreshCanisters(projectId);
  },
});

function selectCanisterMap(state: AppSlice): Map<string, Canister[]> | null {
  return state.canisters;
}

export const selectCanisters = createSelector(
  selectCanisterMap,
  canisterMap => canisterMap?.values().toArray() ?? null,
);
