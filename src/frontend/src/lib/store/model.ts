import type { MyUserProfile, UserProfile, UserStatus } from '@/lib/api-models';
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
};

export type UsersSlice = {
  isUsersInitialized: boolean;
  users: UserProfile[] | null;

  initializeUsers: () => Promise<void>;
  clearUsers: () => void;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  setUserStatus: (userId: string, status: UserStatus) => Promise<void>;
};

export type AppSlice = AuthSlice & ApiSlice & UserProfileSlice & UsersSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
