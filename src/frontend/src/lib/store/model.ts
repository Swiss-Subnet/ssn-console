import type {
  Canister,
  CreateTrustedPartnerRequest,
  CreateOrgInviteRequest,
  OrgInvite,
  TrustedPartner,
  UserProfile,
  UserStatus,
  GetUserStatsResponse,
  TermsAndConditions,
  UpsertTermsAndConditionsDecisionRequest,
  CreateTermsAndConditionsRequest,
  Organization,
  Project,
  Team,
} from '@/lib/api-models';
import type {
  CanisterApi,
  CanisterHistoryApi,
  TrustedPartnerApi,
  UserProfileApi,
  ManagementCanisterApi,
  TermsAndConditionsApi,
  ProjectApi,
  OrganizationApi,
  TeamApi,
  InviteApi,
  AuthApi,
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
  agent: HttpAgent;
  actor: ActorSubclass<_SERVICE>;
  userProfileApi: UserProfileApi;
  canisterApi: CanisterApi;
  canisterHistoryApi: CanisterHistoryApi;
  authApi: AuthApi;
  managementCanisterApi: ManagementCanisterApi;
  trustedPartnerApi: TrustedPartnerApi;
  termsAndConditionsApi: TermsAndConditionsApi;
  projectApi: ProjectApi;
  organizationApi: OrganizationApi;
  teamApi: TeamApi;
  inviteApi: InviteApi;

  setAgentIdentity: (identity: Identity) => void;
};

export type UserProfileSlice = {
  isProfileInitialized: boolean;
  isProfileLoading: boolean;
  profile: UserProfile | null;

  initializeUserProfile: () => Promise<void>;
  clearUserProfile: () => void;

  setEmail: (email: string) => Promise<void>;
  setEmailVerified: () => void;
  sendVerificationEmail: (email: string) => Promise<void>;
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
  canisters: Map<string, Canister[]> | null;

  initializeCanisters: (projectId: string) => Promise<void>;
  refreshCanisters: (projectId: string) => Promise<void>;
  clearCanisters: () => void;
  createCanister: (projectId: string) => Promise<void>;
  addMissingController: (
    canisterId: string,
    projectId: string,
  ) => Promise<void>;
  addController: (
    canisterId: string,
    controllerId: string,
    projectId: string,
  ) => Promise<void>;
  removeCanister: (
    canisterRecordId: string,
    projectId: string,
  ) => Promise<void>;
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

export type ProjectsSlice = {
  isProjectsInitialized: boolean;
  projects: Project[];

  initializeProjects: () => Promise<void>;
  clearProjects: () => void;
  loadOrgProjects: (orgId: string) => Promise<Project[]>;
  createProject: (orgId: string, name: string) => Promise<Project>;
  updateProject: (projectId: string, name: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  loadProjectTeams: (projectId: string) => Promise<Team[]>;
  addTeamToProject: (projectId: string, teamId: string) => Promise<void>;
  removeTeamFromProject: (projectId: string, teamId: string) => Promise<void>;
};

export type OrganizationsSlice = {
  isOrganizationsInitialized: boolean;
  organizations: Organization[];

  initializeOrganizations: () => Promise<void>;
  clearOrganizations: () => void;
  createOrganization: (name: string) => Promise<Organization>;
  updateOrganization: (orgId: string, name: string) => Promise<Organization>;
  deleteOrganization: (orgId: string) => Promise<void>;
  loadOrgUsers: (
    orgId: string,
  ) => Promise<import('@/lib/api-models').OrgUser[]>;
};

export type InvitesSlice = {
  isMyInvitesInitialized: boolean;
  myInvites: OrgInvite[];

  initializeMyInvites: () => Promise<void>;
  clearMyInvites: () => void;
  refreshMyInvites: () => Promise<void>;
  createOrgInvite: (req: CreateOrgInviteRequest) => Promise<OrgInvite>;
  listOrgInvites: (orgId: string) => Promise<OrgInvite[]>;
  revokeOrgInvite: (inviteId: string) => Promise<void>;
  acceptOrgInvite: (inviteId: string) => Promise<void>;
  declineOrgInvite: (inviteId: string) => Promise<void>;
};

export type TeamsSlice = {
  isTeamsInitialized: boolean;
  teams: Team[];

  initializeTeams: () => Promise<void>;
  clearTeams: () => void;
  loadOrgTeams: (orgId: string) => Promise<Team[]>;
  createTeam: (orgId: string, name: string) => Promise<Team>;
  updateTeam: (teamId: string, name: string) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<void>;
  addUserToTeam: (teamId: string, userId: string) => Promise<void>;
  loadTeamUsers: (
    teamId: string,
  ) => Promise<import('@/lib/api-models').TeamUser[]>;
};

export type AppSlice = AuthSlice &
  ApiSlice &
  UserProfileSlice &
  UsersSlice &
  CanistersSlice &
  TrustedPartnersSlice &
  TermsAndConditionsSlice &
  ProjectsSlice &
  OrganizationsSlice &
  TeamsSlice &
  InvitesSlice;

export type AppStateCreator<T> = StateCreator<AppSlice, [], [], T>;
