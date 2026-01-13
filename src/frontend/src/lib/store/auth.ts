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
    const { setAgentIdentity, initializeUserProfile } = get();

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
    } catch (err) {
      console.error(err);

      set({
        error: 'Failed to initialize auth client',
        isAuthInitialized: true,
      });
    }
  },

  login: async () => {
    const { authClient, setAgentIdentity, initializeUserProfile } = get();
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
      },
      onError: err => {
        console.error(err);

        set({ error: err || 'Login failed', isLoggingIn: false });
      },
    });
  },

  logout: async () => {
    const { authClient, clearUserProfile, setAgentIdentity } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    await authClient.logout();
    const identity = authClient.getIdentity();
    setAgentIdentity(identity);

    clearUserProfile();
    set({
      isAuthenticated: false,
      identity,
    });
  },
});
