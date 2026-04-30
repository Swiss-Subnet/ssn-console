import { Badge } from '@/components/ui/badge';
import {
  ProposalStatusKind,
  proposalStatusLabel,
  type ProposalStatus,
} from '@/lib/api-models';
import type { FC } from 'react';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'ghost';

function badgeVariant(kind: ProposalStatusKind | null): BadgeVariant {
  switch (kind) {
    case ProposalStatusKind.Executed:
      return 'success';
    case ProposalStatusKind.Failed:
    case ProposalStatusKind.Rejected:
    case ProposalStatusKind.Cancelled:
      return 'destructive';
    case ProposalStatusKind.Open:
    case ProposalStatusKind.PendingApproval:
    case ProposalStatusKind.Executing:
      return 'outline';
    case null:
      return 'secondary';
  }
}

export const ProposalStatusBadge: FC<{ status: ProposalStatus | null }> = ({
  status,
}) => (
  <Badge variant={badgeVariant(status?.kind ?? null)}>
    {proposalStatusLabel(status)}
  </Badge>
);
