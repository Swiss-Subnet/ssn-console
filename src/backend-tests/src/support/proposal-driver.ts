import type { Actor, PocketIc } from '@dfinity/pic';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import {
  idlFactory,
  type _SERVICE,
  type Proposal,
  type ProposalOperation,
} from '@ssn/backend-api';
import { extractOkResponse } from './error';

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
    return this.createProposal(identity, projectId, { CreateCanister: {} });
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
    try {
      this.actor.setIdentity(identity);
      const proposalRes = await this.actor.create_proposal({
        project_id: projectId,
        operation: [operation],
      });
      const proposal = extractOkResponse(proposalRes);

      return proposal;
    } finally {
      this.actor.setIdentity(this.defaultIdentity);
    }
  }
}
