import type { AppStateCreator, ProposalsSlice } from '@/lib/store/model';

export const createProposalsSlice: AppStateCreator<ProposalsSlice> = (
  _set,
  get,
) => ({
  async listProjectProposals(req) {
    return get().proposalApi.listProjectProposals(req);
  },

  async getProposal(proposalId) {
    return get().proposalApi.getProposal({ proposalId });
  },

  async voteProposal(proposalId, vote) {
    return get().proposalApi.voteProposal({ proposalId, vote });
  },

  async cancelProposal(proposalId) {
    return get().proposalApi.cancelProposal({ proposalId });
  },

  async getUserProfilesByPrincipals(projectId, principals) {
    return get().userProfileApi.getUserProfilesByPrincipals({
      projectId,
      principals,
    });
  },
});
