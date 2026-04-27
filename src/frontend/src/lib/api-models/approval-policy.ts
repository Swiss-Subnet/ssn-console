import { mapOkResponse } from '@/lib/api-models/error';
import type {
  ApprovalPolicy as ApiApprovalPolicy,
  ListProjectApprovalPoliciesRequest as ApiListProjectApprovalPoliciesRequest,
  ListProjectApprovalPoliciesResponse as ApiListProjectApprovalPoliciesResponse,
  OperationType as ApiOperationType,
  PolicyType as ApiPolicyType,
  UpsertApprovalPolicyRequest as ApiUpsertApprovalPolicyRequest,
  UpsertApprovalPolicyResponse as ApiUpsertApprovalPolicyResponse,
} from '@ssn/backend-api';

export enum ApprovalOperationType {
  CreateCanister = 'CreateCanister',
  AddCanisterController = 'AddCanisterController',
}

export const APPROVAL_OPERATION_TYPES: ApprovalOperationType[] = [
  ApprovalOperationType.CreateCanister,
  ApprovalOperationType.AddCanisterController,
];

export type ApprovalPolicyType =
  | { kind: 'AutoApprove' }
  | { kind: 'FixedQuorum'; threshold: number };

export type ApprovalPolicy = {
  id: string;
  operationType: ApprovalOperationType;
  policyType: ApprovalPolicyType;
};

export type ListProjectApprovalPoliciesRequest = {
  projectId: string;
};

export type ListProjectApprovalPoliciesResponse = {
  approvalPolicies: ApprovalPolicy[];
};

export type UpsertApprovalPolicyRequest = {
  projectId: string;
  operationType: ApprovalOperationType;
  policyType: ApprovalPolicyType;
};

export function mapListProjectApprovalPoliciesRequest(
  req: ListProjectApprovalPoliciesRequest,
): ApiListProjectApprovalPoliciesRequest {
  return { project_id: req.projectId };
}

export function mapListProjectApprovalPoliciesResponse(
  res: ApiListProjectApprovalPoliciesResponse,
): ListProjectApprovalPoliciesResponse {
  const okRes = mapOkResponse(res);
  return {
    approvalPolicies: okRes.approval_policies.map(mapApprovalPolicyResponse),
  };
}

export function mapUpsertApprovalPolicyRequest(
  req: UpsertApprovalPolicyRequest,
): ApiUpsertApprovalPolicyRequest {
  return {
    project_id: req.projectId,
    operation_type: mapApprovalOperationTypeToApi(req.operationType),
    policy_type: mapApprovalPolicyTypeToApi(req.policyType),
  };
}

export function mapUpsertApprovalPolicyResponse(
  res: ApiUpsertApprovalPolicyResponse,
): ApprovalPolicy {
  return mapApprovalPolicyResponse(mapOkResponse(res));
}

export function mapApprovalPolicyResponse(
  res: ApiApprovalPolicy,
): ApprovalPolicy {
  return {
    id: res.id,
    operationType: mapApprovalOperationType(res.operation_type),
    policyType: mapApprovalPolicyType(res.policy_type),
  };
}

function mapApprovalOperationType(op: ApiOperationType): ApprovalOperationType {
  if ('CreateCanister' in op) {
    return ApprovalOperationType.CreateCanister;
  }
  return ApprovalOperationType.AddCanisterController;
}

function mapApprovalOperationTypeToApi(
  op: ApprovalOperationType,
): ApiOperationType {
  if (op === ApprovalOperationType.CreateCanister) {
    return { CreateCanister: {} };
  }
  return { AddCanisterController: {} };
}

function mapApprovalPolicyType(p: ApiPolicyType): ApprovalPolicyType {
  if ('AutoApprove' in p) {
    return { kind: 'AutoApprove' };
  }
  return { kind: 'FixedQuorum', threshold: p.FixedQuorum.threshold };
}

function mapApprovalPolicyTypeToApi(p: ApprovalPolicyType): ApiPolicyType {
  if (p.kind === 'AutoApprove') {
    return { AutoApprove: {} };
  }
  return { FixedQuorum: { threshold: p.threshold } };
}

export const DEFAULT_APPROVAL_POLICY_TYPE: ApprovalPolicyType = {
  kind: 'AutoApprove',
};

export function approvalOperationLabel(op: ApprovalOperationType): string {
  switch (op) {
    case ApprovalOperationType.CreateCanister:
      return 'Create canister';
    case ApprovalOperationType.AddCanisterController:
      return 'Add canister controller';
  }
}
