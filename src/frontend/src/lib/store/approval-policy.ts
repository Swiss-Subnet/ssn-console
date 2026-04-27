import type { AppStateCreator, ApprovalPoliciesSlice } from '@/lib/store/model';

export const createApprovalPoliciesSlice: AppStateCreator<
  ApprovalPoliciesSlice
> = (_set, get) => ({
  async loadProjectApprovalPolicies(projectId) {
    const res = await get().approvalPolicyApi.listProjectApprovalPolicies({
      projectId,
    });
    return res.approvalPolicies;
  },

  async upsertApprovalPolicy(req) {
    return get().approvalPolicyApi.upsertApprovalPolicy(req);
  },
});
