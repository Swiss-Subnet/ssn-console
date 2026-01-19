import { UserStatus } from '@/lib/api-models';
import type {
  AppSlice,
  AppStateCreator,
  UserProfileSlice,
} from '@/lib/store/model';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export const createUserProfileSlice: AppStateCreator<UserProfileSlice> = (
  set,
  get,
) => ({
  isProfileInitialized: false,
  isProfileLoading: false,
  profile: null,

  async initializeUserProfile() {
    set({ isProfileLoading: true });

    const { getUserProfileApi, isAuthenticated } = get();
    const userProfileApi = getUserProfileApi();

    if (!isAuthenticated) {
      set({ isProfileInitialized: true, isProfileLoading: false });
      return;
    }

    try {
      const profile = await userProfileApi.getOrCreateMyUserProfile();
      set({ profile });
    } catch (err) {
      showErrorToast('Failed to initialize user profile', err);
    } finally {
      set({ isProfileInitialized: true, isProfileLoading: false });
    }
  },

  clearUserProfile() {
    set({ profile: null });
  },

  setEmail: async (email: string) => {
    const { getUserProfileApi, isAuthenticated, isProfileInitialized } = get();
    const userProfileApi = getUserProfileApi();

    try {
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
      showSuccessToast('Email registered successfully!');
    } catch (err) {
      showErrorToast('Failed to update email', err);
    }
  },
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}

export function selectIsActive(state: AppSlice): boolean {
  return state.profile?.status === UserStatus.Active;
}
