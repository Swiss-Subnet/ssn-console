import { mapOkResponse } from '@/lib/api-models/error';
import { isNil } from '@/lib/nil';
import { fromCandidOpt, toCandidOpt } from '@/lib/utils';
import { Principal } from '@icp-sdk/core/principal';
import type {
  CancelProposalRequest as ApiCancelProposalRequest,
  CancelProposalResponse as ApiCancelProposalResponse,
  GetProposalRequest as ApiGetProposalRequest,
  GetProposalResponse as ApiGetProposalResponse,
  ListProjectProposalsRequest as ApiListProjectProposalsRequest,
  ListProjectProposalsResponse as ApiListProjectProposalsResponse,
  Proposal as ApiProposal,
  ProposalOperation as ApiProposalOperation,
  ProposalStatus as ApiProposalStatus,
  ProposalStatusFilter as ApiProposalStatusFilter,
  ProposalVote as ApiProposalVote,
  Vote as ApiVote,
  VoteProposalRequest as ApiVoteProposalRequest,
  VoteProposalResponse as ApiVoteProposalResponse,
} from '@ssn/backend-api';

export type ProposalOutcome =
  | { kind: 'executed' }
  | { kind: 'pendingApproval'; proposalId: string };

export function readProposalOutcome(proposal: ApiProposal): ProposalOutcome {
  const [status] = proposal.status;
  if (isNil(status)) {
    throw new Error('Proposal returned without a status');
  }
  if ('Failed' in status) {
    throw new Error(status.Failed.message);
  }
  if ('Rejected' in status) {
    throw new Error('Proposal was rejected');
  }
  if ('Cancelled' in status) {
    throw new Error('Proposal was cancelled');
  }
  if ('PendingApproval' in status) {
    return { kind: 'pendingApproval', proposalId: proposal.id };
  }
  return { kind: 'executed' };
}

export enum ProposalStatusKind {
  Open = 'Open',
  PendingApproval = 'PendingApproval',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Executing = 'Executing',
  Executed = 'Executed',
  Failed = 'Failed',
}

export type ProposalStatus =
  | { kind: ProposalStatusKind.Open }
  | {
      kind: ProposalStatusKind.PendingApproval;
      threshold: number;
      approvers: string[];
      votes: ProposalVoteRecord[];
    }
  | { kind: ProposalStatusKind.Rejected }
  | { kind: ProposalStatusKind.Cancelled }
  | { kind: ProposalStatusKind.Executing }
  | { kind: ProposalStatusKind.Executed }
  | { kind: ProposalStatusKind.Failed; message: string };

export enum Vote {
  Approve = 'Approve',
  Reject = 'Reject',
}

export type ProposalVoteRecord = {
  voter: string;
  vote: Vote;
};

export type ProposalOperation =
  | { kind: 'CreateCanister' }
  | {
      kind: 'AddCanisterController';
      canisterId: string;
      controllerId: string;
    };

export type Proposal = {
  id: string;
  projectId: string;
  proposerId: string;
  status: ProposalStatus | null;
  operation: ProposalOperation | null;
};

export const PROPOSAL_OPEN_FILTER: ProposalStatusKind[] = [
  ProposalStatusKind.Open,
  ProposalStatusKind.PendingApproval,
];

export const PROPOSAL_CLOSED_FILTER: ProposalStatusKind[] = [
  ProposalStatusKind.Rejected,
  ProposalStatusKind.Cancelled,
  ProposalStatusKind.Executing,
  ProposalStatusKind.Executed,
  ProposalStatusKind.Failed,
];

export type ListProjectProposalsRequest = {
  projectId: string;
  statusFilter: ProposalStatusKind[] | null;
  after: string | null;
  limit: number | null;
};

export type ListProjectProposalsResponse = {
  proposals: Proposal[];
  nextCursor: string | null;
};

export type GetProposalRequest = {
  proposalId: string;
};

export type VoteProposalRequest = {
  proposalId: string;
  vote: Vote;
};

export type CancelProposalRequest = {
  proposalId: string;
};

export function mapListProjectProposalsRequest(
  req: ListProjectProposalsRequest,
): ApiListProjectProposalsRequest {
  return {
    project_id: req.projectId,
    status_filter: req.statusFilter
      ? [req.statusFilter.map(mapProposalStatusFilterToApi)]
      : [],
    after: toCandidOpt(req.after),
    limit: toCandidOpt(req.limit !== null ? BigInt(req.limit) : null),
  };
}

export function mapListProjectProposalsResponse(
  res: ApiListProjectProposalsResponse,
): ListProjectProposalsResponse {
  const okRes = mapOkResponse(res);
  return {
    proposals: okRes.proposals.map(mapProposalResponse),
    nextCursor: fromCandidOpt(okRes.next_cursor),
  };
}

export function mapGetProposalRequest(
  req: GetProposalRequest,
): ApiGetProposalRequest {
  return { proposal_id: req.proposalId };
}

export function mapGetProposalResponse(res: ApiGetProposalResponse): Proposal {
  return mapProposalResponse(mapOkResponse(res));
}

export function mapVoteProposalRequest(
  req: VoteProposalRequest,
): ApiVoteProposalRequest {
  return {
    proposal_id: req.proposalId,
    vote: mapVoteToApi(req.vote),
  };
}

export function mapVoteProposalResponse(
  res: ApiVoteProposalResponse,
): Proposal {
  return mapProposalResponse(mapOkResponse(res));
}

export function mapCancelProposalRequest(
  req: CancelProposalRequest,
): ApiCancelProposalRequest {
  return { proposal_id: req.proposalId };
}

export function mapCancelProposalResponse(
  res: ApiCancelProposalResponse,
): Proposal {
  return mapProposalResponse(mapOkResponse(res));
}

export function mapProposalResponse(res: ApiProposal): Proposal {
  const [statusOpt] = res.status;
  const [operationOpt] = res.operation;
  return {
    id: res.id,
    projectId: res.project_id,
    proposerId: res.proposer_id,
    status: statusOpt ? mapProposalStatus(statusOpt) : null,
    operation: operationOpt ? mapProposalOperation(operationOpt) : null,
  };
}

function mapProposalStatus(status: ApiProposalStatus): ProposalStatus {
  if ('Open' in status) return { kind: ProposalStatusKind.Open };
  if ('Rejected' in status) return { kind: ProposalStatusKind.Rejected };
  if ('Cancelled' in status) return { kind: ProposalStatusKind.Cancelled };
  if ('Executing' in status) return { kind: ProposalStatusKind.Executing };
  if ('Executed' in status) return { kind: ProposalStatusKind.Executed };
  if ('Failed' in status) {
    return { kind: ProposalStatusKind.Failed, message: status.Failed.message };
  }
  return {
    kind: ProposalStatusKind.PendingApproval,
    threshold: status.PendingApproval.threshold,
    approvers: status.PendingApproval.approvers.map(p => p.toText()),
    votes: status.PendingApproval.votes.map(mapProposalVote),
  };
}

function mapProposalVote(v: ApiProposalVote): ProposalVoteRecord {
  return {
    voter: v.voter.toText(),
    vote: 'Approve' in v.vote ? Vote.Approve : Vote.Reject,
  };
}

function mapProposalOperation(op: ApiProposalOperation): ProposalOperation {
  if ('CreateCanister' in op) return { kind: 'CreateCanister' };
  return {
    kind: 'AddCanisterController',
    canisterId: op.AddCanisterController.canister_id.toText(),
    controllerId: op.AddCanisterController.controller_id.toText(),
  };
}

function mapVoteToApi(vote: Vote): ApiVote {
  return vote === Vote.Approve ? { Approve: {} } : { Reject: {} };
}

function mapProposalStatusFilterToApi(
  kind: ProposalStatusKind,
): ApiProposalStatusFilter {
  switch (kind) {
    case ProposalStatusKind.Open:
      return { Open: {} };
    case ProposalStatusKind.PendingApproval:
      return { PendingApproval: {} };
    case ProposalStatusKind.Rejected:
      return { Rejected: {} };
    case ProposalStatusKind.Cancelled:
      return { Cancelled: {} };
    case ProposalStatusKind.Executing:
      return { Executing: {} };
    case ProposalStatusKind.Executed:
      return { Executed: {} };
    case ProposalStatusKind.Failed:
      return { Failed: {} };
  }
}

export function proposalOperationLabel(op: ProposalOperation | null): string {
  if (!op) return 'Unknown operation';
  switch (op.kind) {
    case 'CreateCanister':
      return 'Create canister';
    case 'AddCanisterController':
      return 'Add canister controller';
  }
}

export function proposalStatusLabel(status: ProposalStatus | null): string {
  if (!status) return 'Unknown';
  switch (status.kind) {
    case ProposalStatusKind.Open:
      return 'Open';
    case ProposalStatusKind.PendingApproval:
      return 'Pending approval';
    case ProposalStatusKind.Rejected:
      return 'Rejected';
    case ProposalStatusKind.Cancelled:
      return 'Cancelled';
    case ProposalStatusKind.Executing:
      return 'Executing';
    case ProposalStatusKind.Executed:
      return 'Executed';
    case ProposalStatusKind.Failed:
      return 'Failed';
  }
}

export function isProposalActionable(status: ProposalStatus | null): boolean {
  if (!status) return false;
  return (
    status.kind === ProposalStatusKind.Open ||
    status.kind === ProposalStatusKind.PendingApproval
  );
}

export function principalToText(p: string | Principal): string {
  return typeof p === 'string' ? p : p.toText();
}
