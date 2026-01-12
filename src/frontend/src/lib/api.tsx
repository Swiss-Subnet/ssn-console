import { BACKEND_CANISTER_ID } from '@/env';
import { useAgent } from '@/lib/agent';
import {
  mapCreateMyUserProfileResponse,
  mapGetMyUserProfileResponse,
  mapListUserProfilesResponse,
  mapUpdateMyUserProfileRequest,
  mapUpdateUserProfileRequest,
  type CreateMyUserProfileResponse,
  type GetMyUserProfileResponse,
  type UpdateMyUserProfileRequest,
  type UpdateUserProfileRequest,
  type UserProfile,
} from '@/lib/api-models/user-profile';
import { isNil, isNotNil } from '@/lib/nil';
import type { PC } from '@/lib/utils';
import { Actor, type ActorSubclass } from '@dfinity/agent';
import { type _SERVICE, idlFactory } from '@ssn/backend-api';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { createContext, useContext, useEffect, useMemo } from 'react';

export class BackendApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async getMyUserProfile(): Promise<GetMyUserProfileResponse> {
    const res = await this.actor.get_my_user_profile();

    return mapGetMyUserProfileResponse(res);
  }

  public async createMyUserProfile(): Promise<CreateMyUserProfileResponse> {
    const res = await this.actor.create_my_user_profile();

    return mapCreateMyUserProfileResponse(res);
  }

  public async getOrCreateMyUserProfile(): Promise<UserProfile> {
    const userProfile = await this.getMyUserProfile();

    if (isNotNil(userProfile)) {
      return userProfile;
    }

    return this.createMyUserProfile();
  }

  public async listUserProfiles(): Promise<UserProfile[]> {
    const res = await this.actor.list_user_profiles();

    return mapListUserProfilesResponse(res);
  }

  public async updateMyUserProfile(
    req: UpdateMyUserProfileRequest,
  ): Promise<void> {
    await this.actor.update_my_user_profile(mapUpdateMyUserProfileRequest(req));
  }

  public async updateUserProfile(req: UpdateUserProfileRequest): Promise<void> {
    await this.actor.update_user_profile(mapUpdateUserProfileRequest(req));
  }
}

const BackendApiContext = createContext<BackendApi | null>(null);

export const BackendApiProvider: PC = ({ children }) => {
  const agent = useAgent();
  const { identity } = useInternetIdentity();

  useEffect(() => {
    if (isNotNil(identity)) {
      agent.replaceIdentity(identity);
    }
  }, [identity, agent]);

  const actor = useMemo(
    () =>
      Actor.createActor<_SERVICE>(idlFactory, {
        agent: agent,
        canisterId: BACKEND_CANISTER_ID,
      }),
    [agent],
  );
  const api = useMemo(() => new BackendApi(actor), [actor]);

  return (
    <BackendApiContext.Provider value={api}>
      {children}
    </BackendApiContext.Provider>
  );
};

export const useBackendApi = (): BackendApi => {
  const context = useContext(BackendApiContext);
  if (isNil(context)) {
    throw new Error('useBackendApi must be used within a BackendApiProvider');
  }
  return context;
};
