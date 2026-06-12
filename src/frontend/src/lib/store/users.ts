import { UserStatus } from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import type { AppStateCreator, UsersSlice } from '@/lib/store/model';
import { selectCanManageUsers } from '@/lib/store/user-profile';

export const createUsersSlice: AppStateCreator<UsersSlice> = (set, get) => ({
  isUsersInitialized: false,
  users: null,
  userStats: null,
  staleUserIds: null,

  async initializeUsers() {
    const state = get();
    const { userProfileApi, isAuthenticated, isProfileInitialized } = state;

    if (!isProfileInitialized) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated || !selectCanManageUsers(state)) {
      set({ isUsersInitialized: true });
      return;
    }

    try {
      const [users, userStats, staleUsers] = await Promise.all([
        userProfileApi.listUserProfiles(),
        userProfileApi.getUserStats(),
        userProfileApi.listStaleUsers(),
      ]);
      set({
        users,
        userStats,
        staleUserIds: new Set(staleUsers.map(u => u.id)),
      });
    } finally {
      set({ isUsersInitialized: true });
    }
  },

  clearUsers() {
    set({ users: null, staleUserIds: null });
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
    const state = get();
    const { userProfileApi, isAuthenticated, isProfileInitialized, profile } =
      state;

    if (!isProfileInitialized || isNil(profile)) {
      throw new Error('User profile is not initialized');
    }

    if (!isAuthenticated || !selectCanManageUsers(state)) {
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
