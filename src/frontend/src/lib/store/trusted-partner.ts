import type { CreateTrustedPartnerRequest } from '@/lib/api-models';
import type { AppStateCreator, TrustedPartnersSlice } from '@/lib/store/model';
import { showErrorToast } from '@/lib/toast';

export const createTrustedPartnerSlice: AppStateCreator<
  TrustedPartnersSlice
> = (set, get) => ({
  isTrustedPartnersInitialized: false,
  trustedPartners: null,

  async initializeTrustedPartners() {
    const { getTrustedPartnerApi, isAuthenticated } = get();
    const trustedPartnerApi = getTrustedPartnerApi();

    if (!isAuthenticated) {
      set({ isTrustedPartnersInitialized: true });
      return;
    }

    try {
      const trustedPartners = await trustedPartnerApi.listTrustedPartners();
      set({ trustedPartners });
    } catch (err) {
      showErrorToast('Failed to initialize trusted partners', err);
    } finally {
      set({ isTrustedPartnersInitialized: true });
    }
  },

  clearTrustedPartners() {
    set({ trustedPartners: null });
  },

  createTrustedPartner: async (req: CreateTrustedPartnerRequest) => {
    const {
      getTrustedPartnerApi,
      isAuthenticated,
      isTrustedPartnersInitialized,
    } = get();
    const trustedPartnerApi = getTrustedPartnerApi();

    try {
      if (!isTrustedPartnersInitialized) {
        throw new Error('Trusted partners are not initialized');
      }

      if (!isAuthenticated) {
        return;
      }

      const newTrustedPartner =
        await trustedPartnerApi.createTrustedPartner(req);

      set(state => {
        if (!state.trustedPartners) {
          return state;
        }

        return {
          trustedPartners: [...state.trustedPartners, newTrustedPartner],
        };
      });
    } catch (err) {
      showErrorToast('Failed to create trusted partner', err);
    }
  },
});
