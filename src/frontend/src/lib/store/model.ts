import type { MyUserProfile } from '@/lib/api-models/user-profile';
import type { Identity } from '@dfinity/agent';
import type { AuthClient } from '@dfinity/auth-client';
import type { StateCreator } from 'zustand';

export type AuthSlice = {
  isInitializingAuth: boolean;
  isLoggingIn: boolean;
  isAuthenticated: boolean;
  identity: Identity | null;
  authClient: AuthClient | null;
  error: string | null;

  initializeAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export type UserProfileSlice = {
  profile: MyUserProfile | null;

  setUserProfile: (profile: MyUserProfile) => void;
  clearUserProfile: () => void;
};

export type AppSlice = AuthSlice & UserProfileSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
