import type { AppStateCreator, AuthSlice } from '@/lib/store/model';
import { AuthClient } from '@dfinity/auth-client';
import { IDENTITY_PROVIDER } from '@/env';
import { isNil } from '@/lib/nil';

export const createAuthSlice: AppStateCreator<AuthSlice> = (set, get) => ({
  isAuthInitialized: false,
  isLoggingIn: false,
  isAuthenticated: false,
  identity: null,
  authClient: null,
  error: null,

  initializeAuth: async () => {
    const { setAgentIdentity, initializeUserProfile, initializeUsers } = get();

    try {
      const authClient = await AuthClient.create();
      const isAuthenticated = await authClient.isAuthenticated();
      const identity = authClient.getIdentity();
      setAgentIdentity(identity);

      set({
        authClient,
        isAuthenticated,
        identity,
        isAuthInitialized: true,
      });

      await initializeUserProfile();
      await initializeUsers();
    } catch (err) {
      console.error(err);

      set({
        error: 'Failed to initialize auth client',
        isAuthInitialized: true,
      });
    }
  },

  login: async () => {
    const {
      authClient,
      setAgentIdentity,
      initializeUserProfile,
      initializeUsers,
    } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    set({
      isLoggingIn: true,
    });

    await authClient.login({
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: async () => {
        const identity = authClient.getIdentity();
        setAgentIdentity(identity);
        set({
          isAuthenticated: true,
          isLoggingIn: false,
          identity,
          error: null,
        });

        await initializeUserProfile();
        await initializeUsers();
      },
      onError: err => {
        console.error(err);

        set({ error: err || 'Login failed', isLoggingIn: false });
      },
    });
  },

  logout: async () => {
    const { authClient, clearUserProfile, clearUsers, setAgentIdentity } =
      get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    await authClient.logout();
    const identity = authClient.getIdentity();
    setAgentIdentity(identity);

    clearUserProfile();
    clearUsers();
    set({
      isAuthenticated: false,
      identity,
    });
  },
});
