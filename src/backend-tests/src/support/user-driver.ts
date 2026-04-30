import {
  generateRandomIdentity,
  type Actor,
  type PocketIc,
} from '@dfinity/pic';
import type { Principal } from '@icp-sdk/core/principal';
import {
  idlFactory,
  type _SERVICE,
  type Organization,
  type UserProfile,
} from '@ssn/backend-api';
import type { Identity } from '@icp-sdk/core/agent';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';

export type ActivatedUser = [Identity, UserProfile, Organization];

export class UserDriver {
  private readonly actor: Actor<_SERVICE>;

  constructor(pic: PocketIc, canisterId: Principal) {
    this.actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
  }

  public async createUser(): Promise<ActivatedUser> {
    const identity = generateRandomIdentity();
    this.actor.setIdentity(identity);

    const profileRes = await this.actor.create_my_user_profile();
    const profile = extractOkResponse(profileRes);

    const orgsRes = await this.actor.list_my_organizations();
    const [org] = extractOkResponse(orgsRes);
    if (!org) {
      throw new Error('Expected default organization after signup');
    }

    this.actor.setIdentity(controllerIdentity);
    await this.actor.update_user_profile({
      user_id: profile.id,
      status: [{ Active: null }],
    });

    this.actor.setIdentity(anonymousIdentity);

    return [identity, profile, org];
  }

  public async inviteIntoOrg(
    host: ActivatedUser,
    guest: ActivatedUser,
  ): Promise<void> {
    const [hostIdentity, , hostOrg] = host;
    const [guestIdentity, guestProfile] = guest;

    this.actor.setIdentity(hostIdentity);
    const inviteRes = await this.actor.create_org_invite({
      org_id: hostOrg.id,
      target: { UserId: guestProfile.id },
    });
    const { invite } = extractOkResponse(inviteRes);

    this.actor.setIdentity(guestIdentity);
    await this.actor.accept_org_invite({ invite_id: invite.id });

    this.actor.setIdentity(anonymousIdentity);
  }

  public async inviteIntoOrgAndDefaultTeam(
    host: ActivatedUser,
    guest: ActivatedUser,
  ): Promise<void> {
    await this.inviteIntoOrg(host, guest);

    const [hostIdentity, , hostOrg] = host;
    const [, guestProfile] = guest;

    this.actor.setIdentity(hostIdentity);
    const teamsRes = await this.actor.list_org_teams({ org_id: hostOrg.id });
    const [defaultTeam] = extractOkResponse(teamsRes);
    if (!defaultTeam) {
      throw new Error('Expected default team after signup');
    }

    await this.actor.add_user_to_team({
      team_id: defaultTeam.id,
      user_id: guestProfile.id,
    });

    this.actor.setIdentity(anonymousIdentity);
  }
}
