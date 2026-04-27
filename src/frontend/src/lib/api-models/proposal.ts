import { isNil } from '@/lib/nil';
import type { Proposal as ApiProposal } from '@ssn/backend-api';

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
