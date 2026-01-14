import type { MyUserProfile } from '@/lib/api-models';
import type { UserProfileApi } from '@/lib/api';
import type { ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import type { AuthClient } from '@dfinity/auth-client';
import type { _SERVICE } from '@ssn/backend-api';
import type { StateCreator } from 'zustand';

export type AuthSlice = {
  isAuthInitialized: boolean;
  isLoggingIn: boolean;
  isAuthenticated: boolean;
  identity: Identity | null;
  authClient: AuthClient | null;
  error: string | null;

  initializeAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export type ApiSlice = {
  agent: HttpAgent | null;
  actor: ActorSubclass<_SERVICE> | null;
  userProfileApi: UserProfileApi | null;

  initializeApi: () => void;
  setAgentIdentity: (identity: Identity) => void;
};

export type UserProfileSlice = {
  isProfileInitialized: boolean;
  profile: MyUserProfile | null;

  initializeUserProfile: () => Promise<void>;
  clearUserProfile: () => void;

  setEmail: (email: string) => Promise<void>;
};

export type AppSlice = AuthSlice & ApiSlice & UserProfileSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
