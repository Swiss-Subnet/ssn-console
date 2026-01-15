import type {
  Canister,
  CanisterStatusResponse,
  MyUserProfile,
  UserProfile,
  UserStatus,
} from '@/lib/api-models';
import type { CanisterApi, UserProfileApi } from '@/lib/api';
import type { ActorSubclass, HttpAgent, Identity } from '@icp-sdk/core/agent';
import type { AuthClient } from '@icp-sdk/auth/client';
import type { _SERVICE } from '@ssn/backend-api';
import type { StateCreator } from 'zustand';
import type { ManagementCanisterApi } from '@/lib/api/management-canister';

export type AuthSlice = {
  isAuthInitialized: boolean;
  isLoggingIn: boolean;
  isAuthenticated: boolean;
  identity: Identity | null;
  authClient: AuthClient | null;
  error: string | null;

  initializeData: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export type ApiSlice = {
  agent: HttpAgent | null;
  actor: ActorSubclass<_SERVICE> | null;
  userProfileApi: UserProfileApi | null;
  canisterApi: CanisterApi | null;
  managementCanisterApi: ManagementCanisterApi | null;

  initializeApi: () => void;
  setAgentIdentity: (identity: Identity) => void;
  getUserProfileApi: () => UserProfileApi;
  getCanisterApi: () => CanisterApi;
  getManagementCanisterApi: () => ManagementCanisterApi;
};

export type UserProfileSlice = {
  isProfileInitialized: boolean;
  profile: MyUserProfile | null;

  initializeUserProfile: () => Promise<void>;
  clearUserProfile: () => void;

  setEmail: (email: string) => Promise<void>;
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

export type CanisterState = Canister & {
  isLoading: boolean;
  status: CanisterStatusResponse | null;
};

export type CanistersSlice = {
  isCanistersInitialized: boolean;
  canisters: CanisterState[] | null;

  initializeCanisters: () => Promise<void>;
  clearCanisters: () => void;
  createCanister: () => Promise<void>;
  addController: (
    canisterPrincipal: string,
    controller: string,
  ) => Promise<void>;
};

export type AppSlice = AuthSlice &
  ApiSlice &
  UserProfileSlice &
  UsersSlice &
  CanistersSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
