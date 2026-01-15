import { UserStatus } from '@/lib/api-models';
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

  async initializeUserProfile() {
    const { getUserProfileApi, isAuthenticated } = get();
    const userProfileApi = getUserProfileApi();

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

  clearUserProfile() {
    set({ profile: null });
  },

  setEmail: async (email: string) => {
    const { getUserProfileApi, isAuthenticated, isProfileInitialized } = get();
    const userProfileApi = getUserProfileApi();

    if (!isProfileInitialized) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated) {
      return;
    }

    await userProfileApi.updateMyUserProfile({ email });

    set(state => {
      if (!state.profile) {
        return state;
      }

      return {
        profile: { ...state.profile, email },
      };
    });
  },
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}

export function selectIsActive(state: AppSlice): boolean {
  return state.profile?.status === UserStatus.Active;
}
