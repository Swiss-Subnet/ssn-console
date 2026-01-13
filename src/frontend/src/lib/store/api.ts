import { BACKEND_CANISTER_ID, SHOULD_FETCH_ROOT_KEY } from '@/env';
import { UserProfileApi } from '@/lib/api';
import { isNil } from '@/lib/nil';
import type { ApiSlice, AppStateCreator } from '@/lib/store/model';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory, type _SERVICE } from '@ssn/backend-api';

export const createApiSlice: AppStateCreator<ApiSlice> = (set, get) => ({
  agent: null,
  actor: null,
  userProfileApi: null,

  initializeApi: () => {
    const agent = HttpAgent.createSync({
      shouldFetchRootKey: SHOULD_FETCH_ROOT_KEY,
    });
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
      agent: agent,
      canisterId: BACKEND_CANISTER_ID,
    });
    const userProfileApi = new UserProfileApi(actor);

    set({ agent, actor, userProfileApi });
  },

  setAgentIdentity: identity => {
    const { agent } = get();
    if (isNil(agent)) {
      throw new Error('Agent is not initialized');
    }

    agent.replaceIdentity(identity);
  },
});
