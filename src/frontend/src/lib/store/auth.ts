import type { AppStateCreator, AuthSlice } from '@/lib/store/model';
import { AuthClient } from '@icp-sdk/auth/client';
import { DERIVATION_ORIGIN, IDENTITY_PROVIDER } from '@/env';
import { isNil } from '@/lib/nil';
import { showErrorToast } from '@/lib/toast';
import { AnonymousIdentity } from '@icp-sdk/core/agent';

const NANOS_PER_SEC = 1_000_000_000;
const SECS_PER_MIN = 60;
const MINS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const createAuthSlice: AppStateCreator<AuthSlice> = (set, get) => ({
  isAuthInitialized: false,
  isLoggingIn: false,
  isAuthenticated: false,
  identity: null,
  authClient: null,
  error: null,

  async initializeData() {
    const {
      initializeUserProfile,
      initializeUsers,
      initializeCanisters,
      initializeTrustedPartners,
    } = get();

    await initializeUserProfile();
    await Promise.all([
      initializeUsers(),
      initializeCanisters(),
      initializeTrustedPartners(),
    ]);
  },

  async initializeAuth() {
    const { setAgentIdentity, initializeData } = get();

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

      await initializeData();
    } catch (err) {
      showErrorToast('Failed to initialize auth client', err);
    } finally {
      set({ isAuthInitialized: true });
    }
  },

  async login() {
    const { authClient, setAgentIdentity, initializeData } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    set({
      isLoggingIn: true,
    });

    await authClient.login({
      identityProvider: IDENTITY_PROVIDER,
      derivationOrigin: DERIVATION_ORIGIN,
      maxTimeToLive: BigInt(
        7 * HOURS_PER_DAY * MINS_PER_HOUR * SECS_PER_MIN * NANOS_PER_SEC,
      ), // 7 days
      onSuccess: async () => {
        const identity = authClient.getIdentity();
        setAgentIdentity(identity);

        set({
          isAuthenticated: true,
          isLoggingIn: false,
          identity,
        });
        await initializeData();
      },
      onError: err => {
        showErrorToast('Login failed', err);
        set({ isLoggingIn: false });
      },
    });
  },

  async logout() {
    const {
      authClient,
      clearUserProfile,
      clearUsers,
      clearCanisters,
      clearTrustedPartners,
      setAgentIdentity,
    } = get();
    if (isNil(authClient)) {
      throw new Error('AuthClient is not initialized');
    }

    try {
      await authClient.logout();
      const identity = authClient.getIdentity();
      setAgentIdentity(identity);
      set({
        isAuthenticated: false,
        identity,
      });
    } catch (err) {
      showErrorToast('Logout failed', err);

      const identity = new AnonymousIdentity();
      setAgentIdentity(identity);
      set({
        isAuthenticated: false,
        identity,
      });
    } finally {
      clearUserProfile();
      clearUsers();
      clearCanisters();
      clearTrustedPartners();
    }
  },
});
