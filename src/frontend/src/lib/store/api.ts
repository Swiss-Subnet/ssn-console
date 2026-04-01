import { BACKEND_CANISTER_ID, SHOULD_FETCH_ROOT_KEY } from '@/env';
import {
  CanisterApi,
  TrustedPartnerApi,
  UserProfileApi,
  ManagementCanisterApi,
  TermsAndConditionsApi,
  ProjectApi,
  OrganizationApi,
  AuthApi,
} from '@/lib/api';
import { OFFCHAIN_SERVICE_URL } from '@/env';
import { isNil } from '@/lib/nil';
import type { ApiSlice, AppStateCreator } from '@/lib/store/model';
import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import {
  idlFactory as backendIdlFactory,
  type _SERVICE as BACKEND_API_SERVICE,
} from '@ssn/backend-api';
import {
  idlFactory as managementCanisterIdlFactory,
  type _SERVICE as MANAGEMENT_CANISTER_SERVICE,
} from '@ssn/management-canister';

export const createApiSlice: AppStateCreator<ApiSlice> = (set, get) => ({
  agent: null,
  actor: null,
  userProfileApi: null,
  canisterApi: null,
  managementCanisterApi: null,
  authApi: null,
  trustedPartnerApi: null,
  termsAndConditionsApi: null,
  projectApi: null,
  organizationApi: null,

  initializeApi() {
    const agent = HttpAgent.createSync({
      shouldFetchRootKey: SHOULD_FETCH_ROOT_KEY,
    });
    const backendApiActor = Actor.createActor<BACKEND_API_SERVICE>(
      backendIdlFactory,
      {
        agent: agent,
        canisterId: BACKEND_CANISTER_ID,
      },
    );
    const managementCanisterActor =
      Actor.createActor<MANAGEMENT_CANISTER_SERVICE>(
        managementCanisterIdlFactory,
        {
          agent: agent,
          canisterId: Principal.managementCanister(),
        },
      );

    const userProfileApi = new UserProfileApi(backendApiActor);
    const canisterApi = new CanisterApi(backendApiActor);
    const managementCanisterApi = new ManagementCanisterApi(
      managementCanisterActor,
    );
    const trustedPartnerApi = new TrustedPartnerApi(backendApiActor);
    const termsAndConditionsApi = new TermsAndConditionsApi(backendApiActor);
    const projectApi = new ProjectApi(backendApiActor);
    const organizationApi = new OrganizationApi(backendApiActor);
    const authApi = new AuthApi(OFFCHAIN_SERVICE_URL);

    set({
      agent,
      actor: backendApiActor,
      userProfileApi,
      canisterApi,
      managementCanisterApi,
      trustedPartnerApi,
      termsAndConditionsApi,
      projectApi,
      organizationApi,
      authApi,
    });
  },

  setAgentIdentity: identity => {
    const { agent } = get();
    if (isNil(agent)) {
      throw new Error('Agent is not initialized');
    }

    agent.replaceIdentity(identity);
  },

  getUserProfileApi() {
    const { userProfileApi } = get();
    if (isNil(userProfileApi)) {
      throw new Error('UserProfileApi is not initialized');
    }
    return userProfileApi;
  },

  getCanisterApi() {
    const { canisterApi } = get();
    if (isNil(canisterApi)) {
      throw new Error('CanisterApi is not initialized');
    }

    return canisterApi;
  },

  getManagementCanisterApi() {
    const { managementCanisterApi } = get();
    if (isNil(managementCanisterApi)) {
      throw new Error('ManagementCanisterApi is not initialized');
    }

    return managementCanisterApi;
  },

  getTrustedPartnerApi() {
    const { trustedPartnerApi } = get();
    if (isNil(trustedPartnerApi)) {
      throw new Error('TrustedPartnerApi is not initialized');
    }

    return trustedPartnerApi;
  },

  getTermsAndConditionsApi() {
    const { termsAndConditionsApi } = get();
    if (isNil(termsAndConditionsApi)) {
      throw new Error('TermsAndConditionsApi is not initialized');
    }

    return termsAndConditionsApi;
  },

  getProjectApi() {
    const { projectApi } = get();
    if (isNil(projectApi)) {
      throw new Error('ProjectApi is not initialized');
    }

    return projectApi;
  },

  getOrganizationApi() {
    const { organizationApi } = get();
    if (isNil(organizationApi)) {
      throw new Error('OrganizationApi is not initialized');
    }

    return organizationApi;
  },

  getAuthApi() {
    const { authApi } = get();
    if (isNil(authApi)) {
      throw new Error('AuthApi is not initialized');
    }

    return authApi;
  },
});
