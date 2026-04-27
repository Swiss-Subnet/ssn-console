import {
  mapListProjectApprovalPoliciesRequest,
  mapListProjectApprovalPoliciesResponse,
  mapUpsertApprovalPolicyRequest,
  mapUpsertApprovalPolicyResponse,
  type ApprovalPolicy,
  type ListProjectApprovalPoliciesRequest,
  type ListProjectApprovalPoliciesResponse,
  type UpsertApprovalPolicyRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class ApprovalPolicyApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async listProjectApprovalPolicies(
    req: ListProjectApprovalPoliciesRequest,
  ): Promise<ListProjectApprovalPoliciesResponse> {
    const res = await this.actor.list_project_approval_policies(
      mapListProjectApprovalPoliciesRequest(req),
    );
    return mapListProjectApprovalPoliciesResponse(res);
  }

  public async upsertApprovalPolicy(
    req: UpsertApprovalPolicyRequest,
  ): Promise<ApprovalPolicy> {
    const res = await this.actor.upsert_approval_policy(
      mapUpsertApprovalPolicyRequest(req),
    );
    return mapUpsertApprovalPolicyResponse(res);
  }
}
