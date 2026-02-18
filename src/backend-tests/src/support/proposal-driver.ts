import type { Actor, PocketIc } from '@dfinity/pic';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import {
  idlFactory,
  type _SERVICE,
  type Proposal,
  type ProposalOperation,
} from '@ssn/backend-api';

export class ProposalDriver {
  private readonly actor: Actor<_SERVICE>;
  private readonly defaultIdentity = new AnonymousIdentity();

  constructor(pic: PocketIc, canisterId: Principal) {
    this.actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
  }

  public async createCanister(
    identity: Identity,
    projectId: string,
  ): Promise<Proposal> {
    return this.createProposal(identity, projectId, { CreateCanister: null });
  }

  public async addCanisterController(
    identity: Identity,
    projectId: string,
    canisterId: Principal,
    controllerId: Principal,
  ): Promise<Proposal> {
    return this.createProposal(identity, projectId, {
      AddCanisterController: {
        canister_id: canisterId,
        controller_id: controllerId,
      },
    });
  }

  private async createProposal(
    identity: Identity,
    projectId: string,
    operation: ProposalOperation,
  ): Promise<Proposal> {
    this.actor.setIdentity(identity);
    const proposal = await this.actor.create_proposal({
      project_id: projectId,
      operation,
    });

    this.actor.setIdentity(this.defaultIdentity);
    return proposal;
  }
}
