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
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}
