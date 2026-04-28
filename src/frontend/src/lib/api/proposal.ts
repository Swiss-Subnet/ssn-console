import {
  mapCancelProposalRequest,
  mapCancelProposalResponse,
  mapGetProposalRequest,
  mapGetProposalResponse,
  mapListProjectProposalsRequest,
  mapListProjectProposalsResponse,
  mapVoteProposalRequest,
  mapVoteProposalResponse,
  type CancelProposalRequest,
  type GetProposalRequest,
  type ListProjectProposalsRequest,
  type ListProjectProposalsResponse,
  type Proposal,
  type VoteProposalRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class ProposalApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listProjectProposals(
    req: ListProjectProposalsRequest,
  ): Promise<ListProjectProposalsResponse> {
    const res = await this.actor.list_project_proposals(
      mapListProjectProposalsRequest(req),
    );
    return mapListProjectProposalsResponse(res);
  }

  public async getProposal(req: GetProposalRequest): Promise<Proposal> {
    const res = await this.actor.get_proposal(mapGetProposalRequest(req));
    return mapGetProposalResponse(res);
  }

  public async voteProposal(req: VoteProposalRequest): Promise<Proposal> {
    const res = await this.actor.vote_proposal(mapVoteProposalRequest(req));
    return mapVoteProposalResponse(res);
  }

  public async cancelProposal(req: CancelProposalRequest): Promise<Proposal> {
    const res = await this.actor.cancel_proposal(mapCancelProposalRequest(req));
    return mapCancelProposalResponse(res);
  }
}
