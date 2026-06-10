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
  myStaffPermissions: null,

  async initializeUserProfile() {
    set({ isProfileLoading: true });

    const { userProfileApi, staffPermissionsApi, isAuthenticated } = get();

    if (!isAuthenticated) {
      set({ isProfileInitialized: true, isProfileLoading: false });
      return;
    }

    try {
      const profile = await userProfileApi.getOrCreateMyUserProfile();
      const myStaffPermissions =
        await staffPermissionsApi.getMyStaffPermissions();
      set({ profile, myStaffPermissions });
    } finally {
      set({ isProfileInitialized: true, isProfileLoading: false });
    }
  },

  clearUserProfile() {
    set({ profile: null, myStaffPermissions: null });
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

// Controllers (isAdmin) see the whole admin panel. Staff see only the areas
// their granted permissions cover; these selectors mirror the backend gates.
export function selectCanManageUsers(state: AppSlice): boolean {
  return (
    selectIsAdmin(state) || (state.myStaffPermissions?.manageUsers ?? false)
  );
}

export function selectCanReadAllOrgs(state: AppSlice): boolean {
  return (
    selectIsAdmin(state) || (state.myStaffPermissions?.readAllOrgs ?? false)
  );
}

export function selectCanWriteBilling(state: AppSlice): boolean {
  return (
    selectIsAdmin(state) || (state.myStaffPermissions?.writeBilling ?? false)
  );
}

export function selectCanReadMetrics(state: AppSlice): boolean {
  return (
    selectIsAdmin(state) || (state.myStaffPermissions?.readMetrics ?? false)
  );
}

export function selectCanAccessAdmin(state: AppSlice): boolean {
  return (
    selectCanManageUsers(state) ||
    selectCanReadAllOrgs(state) ||
    selectCanWriteBilling(state) ||
    selectCanReadMetrics(state)
  );
}
