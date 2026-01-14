import { isNil } from '@/lib/nil';
import type {
  AppSlice,
  AppStateCreator,
  UserProfileSlice,
} from '@/lib/store/model';

export const createUserProfileSlice: AppStateCreator<UserProfileSlice> = (
  set,
  get,
) => ({
  isProfileInitialized: false,
  profile: null,

  initializeUserProfile: async () => {
    const { userProfileApi, isAuthenticated } = get();
    if (isNil(userProfileApi)) {
      throw new Error('UserProfileApi is not initialized');
    }

    if (!isAuthenticated) {
      set({ isProfileInitialized: true });
      return;
    }

    try {
      const profile = await userProfileApi.getOrCreateMyUserProfile();
      set({ profile });
    } finally {
      set({ isProfileInitialized: true });
    }
  },

  clearUserProfile: () => {
    set({ profile: null });
  },

  setEmail: async (email: string) => {
    const { userProfileApi, isAuthenticated, isProfileInitialized, profile } = get();

    if (isNil(userProfileApi)) {
      throw new Error('UserProfileApi is not initialized');
    }

    if (!isProfileInitialized || isNil(profile)) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated) {
      return;
    }

    // Make the API call
    await userProfileApi.updateMyUserProfile({ email });

    // Update the store directly (no full reload)
    set({
      profile: { ...profile, email }
    });
  },
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}
