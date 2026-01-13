import { UserStatus } from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import type { AppStateCreator, UsersSlice } from '@/lib/store/model';

export const createUsersSlice: AppStateCreator<UsersSlice> = (set, get) => ({
  isUsersInitialized: false,
  users: null,

  initializeUsers: async () => {
    const { userProfileApi, isAuthenticated, isProfileInitialized, profile } =
      get();
    if (isNil(userProfileApi)) {
      throw new Error('UserProfileApi is not initialized');
    }

    if (!isProfileInitialized || isNil(profile)) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated || !profile.isAdmin) {
      set({ isUsersInitialized: true });
      return;
    }

    try {
      const users = await userProfileApi.listUserProfiles();
      set({ users });
    } finally {
      set({ isUsersInitialized: true });
    }
  },

  clearUsers: () => {
    set({ users: null });
  },

  activateUser: async userId => {
    const { setUserStatus } = get();

    await setUserStatus(userId, UserStatus.Active);
  },

  deactivateUser: async userId => {
    const { setUserStatus } = get();

    await setUserStatus(userId, UserStatus.Inactive);
  },

  setUserStatus: async (userId, status) => {
    const { userProfileApi, isAuthenticated, isProfileInitialized, profile } =
      get();
    if (isNil(userProfileApi)) {
      throw new Error('UserProfileApi is not initialized');
    }

    if (!isProfileInitialized || isNil(profile)) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated || !profile.isAdmin) {
      throw new Error('Not authorized to set user status');
    }

    await userProfileApi.updateUserProfile({
      userId,
      status,
    });

    const { users } = get();
    if (isNil(users)) {
      throw new Error('Users are not initialized');
    }

    set({
      users: users.map(user =>
        user.id === userId ? { ...user, status } : user,
      ),
    });
  },
});
