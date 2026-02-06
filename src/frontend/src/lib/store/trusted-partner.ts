import type { AppStateCreator, TrustedPartnersSlice } from '@/lib/store/model';

export const createTrustedPartnerSlice: AppStateCreator<
  TrustedPartnersSlice
> = (set, get) => ({
  isTrustedPartnersInitialized: false,
  trustedPartners: null,

  async initializeTrustedPartners() {
    const { getTrustedPartnerApi, isAuthenticated, profile } = get();
    const trustedPartnerApi = getTrustedPartnerApi();

    if (!isAuthenticated || !profile?.isAdmin) {
      set({ isTrustedPartnersInitialized: true });
      return;
    }

    try {
      const trustedPartners = await trustedPartnerApi.listTrustedPartners();
      set({ trustedPartners });
    } finally {
      set({ isTrustedPartnersInitialized: true });
    }
  },

  clearTrustedPartners() {
    set({ trustedPartners: null });
  },

  async createTrustedPartner(req) {
    const {
      getTrustedPartnerApi,
      isAuthenticated,
      isTrustedPartnersInitialized,
      profile,
    } = get();

    if (!isTrustedPartnersInitialized) {
      throw new Error(
        'Trusted partners must be initialized before creating new trusted partners',
      );
    }
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to create trusted partners');
    }
    if (!profile?.isAdmin) {
      throw new Error('User must be an admin to create trusted partners');
    }

    const trustedPartnerApi = getTrustedPartnerApi();
    const newTrustedPartner = await trustedPartnerApi.createTrustedPartner(req);

    set(state => {
      if (!state.trustedPartners) {
        return {
          trustedPartners: [newTrustedPartner],
        };
      }

      return {
        trustedPartners: [...state.trustedPartners, newTrustedPartner],
      };
    });
  },
});
