import { UserStatus } from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import type { AppStateCreator, UsersSlice } from '@/lib/store/model';
import { showErrorToast } from '@/lib/toast';

export const createUsersSlice: AppStateCreator<UsersSlice> = (set, get) => ({
  isUsersInitialized: false,
  users: null,

  async initializeUsers() {
    const {
      getUserProfileApi,
      isAuthenticated,
      isProfileInitialized,
      profile,
    } = get();
    const userProfileApi = getUserProfileApi();

    if (!isProfileInitialized) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated || !profile?.isAdmin) {
      set({ isUsersInitialized: true });
      return;
    }

    try {
      const users = await userProfileApi.listUserProfiles();
      set({ users });
    } catch (err) {
      showErrorToast('Failed to initialize users', err);
    } finally {
      set({ isUsersInitialized: true });
    }
  },

  clearUsers() {
    set({ users: null });
  },

  async activateUser(userId) {
    const { setUserStatus } = get();

    await setUserStatus(userId, UserStatus.Active);
  },

  async deactivateUser(userId) {
    const { setUserStatus } = get();

    await setUserStatus(userId, UserStatus.Inactive);
  },

  async setUserStatus(userId, status) {
    const {
      getUserProfileApi,
      isAuthenticated,
      isProfileInitialized,
      profile,
    } = get();
    const userProfileApi = getUserProfileApi();

    try {
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
    } catch (err) {
      showErrorToast('Failed to set user status', err);
    }
  },
});
