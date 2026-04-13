import type {
  AppStateCreator,
  TermsAndConditionsSlice,
} from '@/lib/store/model';

export const createTermsAndConditionsSlice: AppStateCreator<
  TermsAndConditionsSlice
> = (set, get) => ({
  isTermsAndConditionsInitialized: false,
  termsAndConditions: null,

  async initializeTermsAndConditions() {
    const { termsAndConditionsApi, isAuthenticated, profile } = get();

    if (!isAuthenticated || profile?.isAdmin) {
      set({ isTermsAndConditionsInitialized: true });
      return;
    }

    try {
      const termsAndConditions =
        await termsAndConditionsApi.getLatestTermsAndConditions();
      set({ termsAndConditions });
    } finally {
      set({ isTermsAndConditionsInitialized: true });
    }
  },

  clearTermsAndConditions() {
    set({ termsAndConditions: null });
  },

  async upsertTermsAndConditionsDecision(req) {
    const {
      termsAndConditionsApi,
      initializeTermsAndConditions,
      isTermsAndConditionsInitialized,
      isAuthenticated,
      profile,
    } = get();

    if (!isTermsAndConditionsInitialized) {
      throw new Error(
        'Terms and conditions must be initialized before upserting terms and conditions responses',
      );
    }
    if (!isAuthenticated) {
      throw new Error(
        'User must be authenticated to upsert terms and conditions responses',
      );
    }
    if (profile?.isAdmin) {
      throw new Error('Admins cannot upsert terms and conditions responses');
    }

    await termsAndConditionsApi.upsertTermsAndConditionsDecision(req);
    await initializeTermsAndConditions();
  },

  async createTermsAndConditions(req) {
    const {
      profile,
      isTermsAndConditionsInitialized,
      isAuthenticated,
      termsAndConditionsApi,
    } = get();

    if (!isTermsAndConditionsInitialized) {
      throw new Error(
        'Terms and conditions must be initialized before creating new terms and conditions',
      );
    }
    if (!isAuthenticated) {
      throw new Error(
        'User must be authenticated before creating new terms and conditions',
      );
    }
    if (!profile?.isAdmin) {
      throw new Error(
        'User must be an admin to create new terms and conditions',
      );
    }

    await termsAndConditionsApi.createTermsAndConditions(req);
  },
});
