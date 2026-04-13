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
    const { isAuthenticated, canisters, refreshCanisters } = get();

    if (!isAuthenticated) {
      set({ isCanistersInitialized: true });
      return;
    }

    if (canisters?.has(projectId)) {
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
    const { canisterApi } = get();

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
    const { canisterApi, refreshCanisters } = get();

    await canisterApi.createCanister();
    await refreshCanisters(projectId);
  },

  async addMissingController(canisterId, projectId) {
    const { managementCanisterApi, refreshCanisters } = get();

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
    const { canisterApi, refreshCanisters } = get();

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
