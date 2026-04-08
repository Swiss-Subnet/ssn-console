import { UserStatus } from '@/lib/api-models';
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
  isProfileLoading: false,
  profile: null,

  async initializeUserProfile() {
    set({ isProfileLoading: true });

    const { userProfileApi, isAuthenticated } = get();

    if (!isAuthenticated) {
      set({ isProfileInitialized: true, isProfileLoading: false });
      return;
    }

    try {
      const profile = await userProfileApi.getOrCreateMyUserProfile();
      set({ profile });
    } finally {
      set({ isProfileInitialized: true, isProfileLoading: false });
    }
  },

  clearUserProfile() {
    set({ profile: null });
  },

  setEmail: async (email: string) => {
    const { userProfileApi, isAuthenticated, isProfileInitialized } = get();

    if (!isProfileInitialized) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated) {
      return;
    }

    await userProfileApi.updateMyUserProfile({ email });

    set(state => {
      if (isNil(state.profile)) {
        return state;
      }

      return {
        profile: { ...state.profile, email },
      };
    });
  },

  setEmailVerified() {
    set(state => {
      if (isNil(state.profile)) {
        return state;
      }

      return {
        profile: { ...state.profile, emailVerified: true },
      };
    });
  },

  async sendVerificationEmail(email: string) {
    const { authApi, isAuthenticated, isProfileInitialized } = get();

    if (!isProfileInitialized) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated) {
      return;
    }

    await authApi.sendEmailVerification(email);
  },
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}

export function selectIsActive(state: AppSlice): boolean {
  return state.profile?.status === UserStatus.Active;
}
