import {
  generateRandomIdentity,
  type Actor,
  type PocketIc,
} from '@dfinity/pic';
import type { Principal } from '@icp-sdk/core/principal';
import { idlFactory, type _SERVICE, type UserProfile } from '@ssn/backend-api';
import { extractOkResponse } from './error';
import { anonymousIdentity, controllerIdentity } from './identity';
import type { Identity } from '@icp-sdk/core/agent';

export class UserDriver {
  private readonly actor: Actor<_SERVICE>;

  constructor(pic: PocketIc, canisterId: Principal) {
    this.actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
  }

  public async createUser(): Promise<[Identity, UserProfile]> {
    const identity = generateRandomIdentity();
    this.actor.setIdentity(identity);

    const profileRes = await this.actor.create_my_user_profile();
    const profile = extractOkResponse(profileRes);

    this.actor.setIdentity(controllerIdentity);
    await this.actor.update_user_profile({
      user_id: profile.id,
      status: [{ Active: null }],
    });

    this.actor.setIdentity(anonymousIdentity);

    return [identity, profile];
  }
}
