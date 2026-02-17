import type {
  Canister,
  CreateTrustedPartnerRequest,
  TrustedPartner,
  UserProfile,
  UserStatus,
  GetUserStatsResponse,
  TermsAndConditions,
  UpsertTermsAndConditionsDecisionRequest,
  CreateTermsAndConditionsRequest,
} from '@/lib/api-models';
import type {
  CanisterApi,
  TrustedPartnerApi,
  UserProfileApi,
  ManagementCanisterApi,
  TermsAndConditionsApi,
} from '@/lib/api';
import type { ActorSubclass, HttpAgent, Identity } from '@icp-sdk/core/agent';
import type { AuthClient } from '@icp-sdk/auth/client';
import type { _SERVICE } from '@ssn/backend-api';
import type { StateCreator } from 'zustand';

export type AuthSlice = {
  isAuthInitialized: boolean;
  isLoggingIn: boolean;
  isAuthenticated: boolean;
  identity: Identity | null;
  authClient: AuthClient | null;

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
  trustedPartnerApi: TrustedPartnerApi | null;
  termsAndConditionsApi: TermsAndConditionsApi | null;

  initializeApi: () => void;
  setAgentIdentity: (identity: Identity) => void;
  getUserProfileApi: () => UserProfileApi;
  getCanisterApi: () => CanisterApi;
  getManagementCanisterApi: () => ManagementCanisterApi;
  getTrustedPartnerApi: () => TrustedPartnerApi;
  getTermsAndConditionsApi: () => TermsAndConditionsApi;
};

export type UserProfileSlice = {
  isProfileInitialized: boolean;
  isProfileLoading: boolean;
  profile: UserProfile | null;

  initializeUserProfile: () => Promise<void>;
  clearUserProfile: () => void;

  setEmail: (email: string) => Promise<void>;
};

export type UsersSlice = {
  isUsersInitialized: boolean;
  users: UserProfile[] | null;
  userStats: GetUserStatsResponse | null;

  initializeUsers: () => Promise<void>;
  clearUsers: () => void;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  setUserStatus: (userId: string, status: UserStatus) => Promise<void>;
};

export type CanistersSlice = {
  isCanistersInitialized: boolean;
  isCanistersLoading: boolean;
  canisters: Canister[] | null;

  initializeCanisters: () => Promise<void>;
  refreshCanisters: () => Promise<void>;
  clearCanisters: () => void;
  createCanister: () => Promise<void>;
  addMissingController: (canisterId: string) => Promise<void>;
  addController: (canisterId: string, controllerId: string) => Promise<void>;
};

export type TrustedPartnersSlice = {
  isTrustedPartnersInitialized: boolean;
  trustedPartners: TrustedPartner[] | null;

  initializeTrustedPartners: () => Promise<void>;
  clearTrustedPartners: () => void;
  createTrustedPartner: (req: CreateTrustedPartnerRequest) => Promise<void>;
};

export type TermsAndConditionsSlice = {
  isTermsAndConditionsInitialized: boolean;
  termsAndConditions: TermsAndConditions | null;

  initializeTermsAndConditions: () => Promise<void>;
  clearTermsAndConditions: () => void;
  upsertTermsAndConditionsDecision: (
    req: UpsertTermsAndConditionsDecisionRequest,
  ) => Promise<void>;
  createTermsAndConditions: (
    req: CreateTermsAndConditionsRequest,
  ) => Promise<void>;
};

export type AppSlice = AuthSlice &
  ApiSlice &
  UserProfileSlice &
  UsersSlice &
  CanistersSlice &
  TrustedPartnersSlice &
  TermsAndConditionsSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
