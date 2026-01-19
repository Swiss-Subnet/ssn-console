import type { AppStateCreator, CanistersSlice } from '@/lib/store/model';
import { showErrorToast } from '@/lib/toast';

export const createCanistersSlice: AppStateCreator<CanistersSlice> = (
  set,
  get,
) => ({
  isCanistersInitialized: false,
  canisters: null,

  async initializeCanisters() {
    const { getCanisterApi, getManagementCanisterApi, isAuthenticated } = get();
    const canisterApi = getCanisterApi();
    const managementCanisterApi = getManagementCanisterApi();

    if (!isAuthenticated) {
      set({ isCanistersInitialized: true });
      return;
    }

    try {
      const canisters = await canisterApi.listMyCanisters();

      set({
        canisters: canisters.map(c => ({
          ...c,
          isLoading: true,
          status: null,
        })),
      });

      await Promise.all(
        canisters.map(async canister => {
          try {
            const status = await managementCanisterApi.getCanisterStatus({
              canisterId: canister.principal,
            });

            set(state => {
              const canisters = state.canisters ?? [];

              return {
                canisters: canisters.map(c =>
                  c.principal === canister.principal ? { ...c, status } : c,
                ),
              };
            });
          } finally {
            set(state => {
              const canisters = state.canisters ?? [];

              return {
                canisters: canisters.map(c =>
                  c.principal === canister.principal
                    ? { ...c, isLoading: false }
                    : c,
                ),
              };
            });
          }
        }),
      );
    } catch (err) {
      showErrorToast('Failed to query canister status', err);
    } finally {
      set({ isCanistersInitialized: true });
    }
  },

  clearCanisters() {
    set({ canisters: null });
  },

  async createCanister() {
    const { getCanisterApi, getManagementCanisterApi } = get();
    const canisterApi = getCanisterApi();
    const managementCanisterApi = getManagementCanisterApi();

    const canister = await canisterApi.createCanister();

    set(state => {
      const canisters = state.canisters ?? [];

      return {
        canisters: [
          ...canisters,
          {
            ...canister,
            isLoading: true,
            status: null,
          },
        ],
      };
    });

    try {
      const status = await managementCanisterApi.getCanisterStatus({
        canisterId: canister.principal,
      });

      set(state => {
        const canisters = state.canisters ?? [];

        return {
          canisters: canisters.map(c =>
            c.principal === canister.principal ? { ...c, status } : c,
          ),
        };
      });
    } catch (err) {
      showErrorToast('Failed to query canister status', err);
    } finally {
      set(state => {
        const canisters = state.canisters ?? [];

        return {
          canisters: canisters.map(c =>
            c.principal === canister.principal ? { ...c, isLoading: false } : c,
          ),
        };
      });
    }
  },

  async addController(canisterPrincipal, controller) {
    const { getManagementCanisterApi, canisters, isCanistersInitialized } =
      get();
    const managementCanisterApi = getManagementCanisterApi();

    try {
      if (!isCanistersInitialized) {
        throw new Error('Canisters are not initialized');
      }

      const canister = canisters?.find(c => c.principal === canisterPrincipal);
      if (!canister) {
        throw new Error(
          `Canister with principal ${canisterPrincipal} not found`,
        );
      }

      const existingControllers = canister.status?.settings.controllers ?? [];
      if (existingControllers.includes(controller)) {
        throw new Error(
          `Controller ${controller} is already a controller of canister ${canisterPrincipal}`,
        );
      }

      await managementCanisterApi.updateSettings({
        canisterId: canisterPrincipal,
        settings: {
          controllers: [...existingControllers, controller],
        },
      });

      set(state => {
        const canisters = state.canisters ?? [];

        return {
          canisters: canisters.map(c => {
            if (c.principal !== canisterPrincipal || !c.status) {
              return c;
            }

            return {
              ...c,
              status: {
                ...c.status,
                settings: {
                  ...c.status.settings,
                  controllers: [...c.status.settings.controllers, controller],
                },
              },
            };
          }),
        };
      });
    } catch (err) {
      showErrorToast('Failed to add controller to canister', err);
    }
  },
});
