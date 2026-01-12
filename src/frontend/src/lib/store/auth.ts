import type { AppStateCreator, AuthSlice } from '@/lib/store/model';
import { AuthClient } from '@dfinity/auth-client';
import { IDENTITY_PROVIDER } from '@/env';
import { isNil } from '@/lib/nil';

export const createAuthSlice: AppStateCreator<AuthSlice> = (set, get) => ({
  isInitializingAuth: true,
  isLoggingIn: false,
  isAuthenticated: false,
  identity: null,
  authClient: null,
  error: null,

  initializeAuth: async () => {
    try {
      const authClient = await AuthClient.create();
      const isAuthenticated = await authClient.isAuthenticated();
      const identity = authClient.getIdentity();

      set({
        authClient,
        isAuthenticated,
        identity,
        isInitializingAuth: false,
      });
    } catch (err) {
      console.error(err);

      set({
        error: 'Failed to initialize auth client',
        isInitializingAuth: false,
      });
    }
  },

  login: async () => {
    const { authClient } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    set({
      isLoggingIn: true,
    });

    await authClient.login({
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: () => {
        const identity = authClient.getIdentity();

        set({
          isAuthenticated: true,
          isLoggingIn: false,
          identity,
          error: null,
        });
      },
      onError: err => {
        console.error(err);

        set({ error: err || 'Login failed', isLoggingIn: false });
      },
    });
  },

  logout: async () => {
    const { authClient, clearUserProfile } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    await authClient.logout();
    const identity = authClient.getIdentity();

    clearUserProfile();
    set({
      isAuthenticated: false,
      identity,
    });
  },
});
