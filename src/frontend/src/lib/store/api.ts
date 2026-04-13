import {
  BACKEND_CANISTER_ID,
  CANISTER_HISTORY_CANISTER_ID,
  SHOULD_FETCH_ROOT_KEY,
} from '@/env';
import {
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
  idlFactory as canisterHistoryIdlFactory,
  type _SERVICE as CANISTER_HISTORY_SERVICE,
} from '@ssn/canister-history-api';
import {
  idlFactory as managementCanisterIdlFactory,
  type _SERVICE as MANAGEMENT_CANISTER_SERVICE,
} from '@ssn/management-canister';

const agent = HttpAgent.createSync({
  shouldFetchRootKey: SHOULD_FETCH_ROOT_KEY,
});
const actor = Actor.createActor<BACKEND_API_SERVICE>(backendIdlFactory, {
  agent: agent,
  canisterId: BACKEND_CANISTER_ID,
});
const managementCanisterActor = Actor.createActor<MANAGEMENT_CANISTER_SERVICE>(
  managementCanisterIdlFactory,
  {
    agent: agent,
    canisterId: Principal.managementCanister(),
  },
);
const canisterHistoryActor = Actor.createActor<CANISTER_HISTORY_SERVICE>(
  canisterHistoryIdlFactory,
  {
    agent: agent,
    canisterId: CANISTER_HISTORY_CANISTER_ID,
  },
);

const userProfileApi = new UserProfileApi(actor);
const canisterApi = new CanisterApi(actor);
const managementCanisterApi = new ManagementCanisterApi(
  managementCanisterActor,
);
const trustedPartnerApi = new TrustedPartnerApi(actor);
const termsAndConditionsApi = new TermsAndConditionsApi(actor);
const projectApi = new ProjectApi(actor);
const organizationApi = new OrganizationApi(actor);
const teamApi = new TeamApi(actor);
const inviteApi = new InviteApi(actor);
const canisterHistoryApi = new CanisterHistoryApi(canisterHistoryActor);
const authApi = new AuthApi(OFFCHAIN_SERVICE_URL);

export const createApiSlice: AppStateCreator<ApiSlice> = (_set, get) => ({
  agent,
  actor,
  userProfileApi,
  canisterApi,
  canisterHistoryApi,
  managementCanisterApi,
  trustedPartnerApi,
  termsAndConditionsApi,
  projectApi,
  organizationApi,
  teamApi,
  inviteApi,
  authApi,

  setAgentIdentity: identity => {
    const { agent } = get();
    if (isNil(agent)) {
      throw new Error('Agent is not initialized');
    }

    agent.replaceIdentity(identity);
  },
});
