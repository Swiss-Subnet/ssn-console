import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlanTier } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { SetOrgPlanButton } from '@/routes/admin/set-org-plan-button';
import { useState, type FC } from 'react';

function tierVariant(tier: PlanTier): 'default' | 'secondary' | 'outline' {
  switch (tier) {
    case PlanTier.Pro:
      return 'default';
    case PlanTier.Enterprise:
      return 'outline';
    case PlanTier.Free:
      return 'secondary';
  }
}

export type OrganizationsTableProps = {
  className?: string;
};

export const OrganizationsTable: FC<OrganizationsTableProps> = ({
  className,
}) => {
  const { adminOrgs, adminOrgsNextCursor, loadMoreAdminOrgs } = useAppStore();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (adminOrgs !== null && adminOrgs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No organizations yet.</p>
    );
  }

  async function onLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      await loadMoreAdminOrgs();
    } catch (err) {
      showErrorToast('Failed to load more organizations', err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="w-1">Members</TableHead>
            <TableHead className="w-1">Plan</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {adminOrgs?.map(org => (
            <TableRow key={org.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span>{org.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {org.id}
                  </span>
                </div>
              </TableCell>

              <TableCell>{org.memberCount}</TableCell>

              <TableCell>
                <Badge variant={tierVariant(org.tier)}>{org.tier}</Badge>
              </TableCell>

              <TableCell>
                <SetOrgPlanButton orgId={org.id} currentTier={org.tier} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {adminOrgsNextCursor !== null && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};
