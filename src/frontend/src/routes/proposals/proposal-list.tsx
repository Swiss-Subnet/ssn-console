import { Breadcrumbs } from '@/components/breadcrumbs';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { H1 } from '@/components/typography/h1';
import {
  PROPOSAL_CLOSED_FILTER,
  PROPOSAL_OPEN_FILTER,
  proposalOperationLabel,
  type Proposal,
  type ProposalStatusKind,
} from '@/lib/api-models';
import { cn } from '@/lib/utils';
import { isNil } from '@/lib/nil';
import { useRequireProjectId } from '@/lib/params';
import { selectOrgMap, selectProjectMap, useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { ProposalStatusBadge } from '@/routes/proposals/proposal-status-badge';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router';

const PAGE_SIZE = 25;

type FilterTab = {
  id: 'all' | 'open' | 'closed';
  label: string;
  filter: ProposalStatusKind[] | null;
};

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', filter: null },
  { id: 'open', label: 'Open', filter: PROPOSAL_OPEN_FILTER },
  { id: 'closed', label: 'Closed', filter: PROPOSAL_CLOSED_FILTER },
];

function shorten(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

const ProposalList: FC = () => {
  const projectId = useRequireProjectId();
  const navigate = useNavigate();
  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);
  const listProjectProposals = useAppStore(s => s.listProjectProposals);

  const project = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );
  const organization = useMemo(
    () => (project ? (orgMap.get(project.orgId) ?? null) : null),
    [project, orgMap],
  );

  const [activeTab, setActiveTab] = useState<FilterTab['id']>('open');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const activeFilter = useMemo(
    () => FILTER_TABS.find(t => t.id === activeTab)?.filter ?? null,
    [activeTab],
  );

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listProjectProposals({
        projectId,
        statusFilter: activeFilter,
        after: null,
        limit: PAGE_SIZE,
      });
      setProposals(res.proposals);
      setNextCursor(res.nextCursor);
    } catch (err) {
      showErrorToast('Failed to load proposals', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeFilter, listProjectProposals]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  async function onLoadMore(): Promise<void> {
    if (isNil(nextCursor)) return;
    setIsLoadingMore(true);
    try {
      const res = await listProjectProposals({
        projectId,
        statusFilter: activeFilter,
        after: nextCursor,
        limit: PAGE_SIZE,
      });
      setProposals(prev => [...prev, ...res.proposals]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      showErrorToast('Failed to load more proposals', err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function openDetail(proposalId: string): void {
    navigate(`/projects/${projectId}/proposals/${proposalId}`);
  }

  return (
    <>
      <Breadcrumbs
        items={[
          ...(organization
            ? [
                {
                  label: organization.name,
                  to: `/organizations/${organization.id}/settings`,
                },
              ]
            : []),
          { label: project?.name ?? 'Project' },
          { label: 'Proposals' },
        ]}
      />
      <H1 className="mt-3">Proposals</H1>

      <div
        className="border-border mt-6 inline-flex rounded-md border p-1"
        role="tablist"
      >
        {FILTER_TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <Button
              key={tab.id}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('h-7 px-3', !active && 'text-muted-foreground')}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Proposer</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && proposals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  Loading proposals…
                </TableCell>
              </TableRow>
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  No proposals to show.
                </TableCell>
              </TableRow>
            ) : (
              proposals.map(p => (
                <TableRow
                  key={p.id}
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => openDetail(p.id)}
                >
                  <TableCell>
                    <ProposalStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>{proposalOperationLabel(p.operation)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {shorten(p.proposerId)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shorten(p.id)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <LoadingButton
            variant="outline"
            size="sm"
            isLoading={isLoadingMore}
            onClick={onLoadMore}
          >
            Load more
          </LoadingButton>
        </div>
      )}
    </>
  );
};

export default ProposalList;
