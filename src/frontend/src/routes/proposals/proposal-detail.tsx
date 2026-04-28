import { Breadcrumbs } from '@/components/breadcrumbs';
import { LoadingButton } from '@/components/loading-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { H1 } from '@/components/typography/h1';
import { isNil } from '@/lib/nil';
import { useRequireProjectId } from '@/lib/params';
import {
  isProposalActionable,
  proposalOperationLabel,
  ProposalStatusKind,
  Vote,
  type Proposal,
  type UserProfileBrief,
} from '@/lib/api-models';
import { selectOrgMap, selectProjectMap, useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { ProposalStatusBadge } from '@/routes/proposals/proposal-status-badge';
import { useEffect, useMemo, useState, type FC } from 'react';
import { useParams } from 'react-router';

function shortenPrincipal(p: string): string {
  if (p.length <= 16) return p;
  return `${p.slice(0, 8)}…${p.slice(-6)}`;
}

function describeOperation(p: Proposal): string {
  if (!p.operation) return 'Unknown operation';
  switch (p.operation.kind) {
    case 'CreateCanister':
      return 'Create a new canister in this project.';
    case 'AddCanisterController':
      return `Add ${shortenPrincipal(p.operation.controllerId)} as a controller of ${shortenPrincipal(p.operation.canisterId)}.`;
  }
}

function renderProfileLabel(
  principal: string,
  profile: UserProfileBrief | null,
): string {
  if (profile?.email) return profile.email;
  return shortenPrincipal(principal);
}

const ProposalDetail: FC = () => {
  const projectId = useRequireProjectId();
  const { proposalId } = useParams();

  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);
  const profile = useAppStore(s => s.profile);
  const identity = useAppStore(s => s.identity);
  const getProposal = useAppStore(s => s.getProposal);
  const voteProposal = useAppStore(s => s.voteProposal);
  const cancelProposal = useAppStore(s => s.cancelProposal);
  const getUserProfilesByPrincipals = useAppStore(
    s => s.getUserProfilesByPrincipals,
  );

  const project = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );
  const organization = useMemo(
    () => (project ? (orgMap.get(project.orgId) ?? null) : null),
    [project, orgMap],
  );

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileMap, setProfileMap] = useState<
    Map<string, UserProfileBrief | null>
  >(new Map());
  const [pendingVote, setPendingVote] = useState<Vote | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const myPrincipal = useMemo(
    () => identity?.getPrincipal().toText() ?? null,
    [identity],
  );

  useEffect(() => {
    if (isNil(proposalId)) return;
    setIsLoading(true);
    getProposal(proposalId)
      .then(setProposal)
      .catch(err => showErrorToast('Failed to load proposal', err))
      .finally(() => setIsLoading(false));
  }, [proposalId, getProposal]);

  useEffect(() => {
    if (
      !proposal ||
      proposal.status?.kind !== ProposalStatusKind.PendingApproval
    ) {
      return;
    }
    const principals = new Set<string>();
    proposal.status.approvers.forEach(p => {
      if (!profileMap.has(p)) principals.add(p);
    });
    proposal.status.votes.forEach(v => {
      if (!profileMap.has(v.voter)) principals.add(v.voter);
    });
    if (principals.size === 0) return;

    getUserProfilesByPrincipals(projectId, [...principals])
      .then(entries => {
        setProfileMap(prev => {
          const next = new Map(prev);
          for (const e of entries) next.set(e.principal, e.profile);
          return next;
        });
      })
      .catch(err => showErrorToast('Failed to resolve voter profiles', err));
  }, [proposal, projectId, getUserProfilesByPrincipals, profileMap]);

  if (isNil(proposalId)) {
    return <p className="text-muted-foreground">Missing proposal id.</p>;
  }

  const status = proposal?.status ?? null;
  const isPendingApproval = status?.kind === ProposalStatusKind.PendingApproval;
  const canVote =
    isPendingApproval &&
    !!project?.yourPermissions.proposalApprove &&
    !!myPrincipal &&
    status.approvers.includes(myPrincipal) &&
    !status.votes.some(v => v.voter === myPrincipal);

  const isProposer = !!profile && proposal?.proposerId === profile.id;
  const isProjectAdmin = !!project?.yourPermissions.projectAdmin;
  const canCancel =
    (isProposer || isProjectAdmin) && isProposalActionable(status);

  async function onVote(vote: Vote): Promise<void> {
    if (!proposalId) return;
    setPendingVote(vote);
    try {
      const updated = await voteProposal(proposalId, vote);
      setProposal(updated);
      showSuccessToast(
        vote === Vote.Approve ? 'Approved' : 'Rejected',
        'Your vote was recorded.',
      );
    } catch (err) {
      showErrorToast('Failed to record vote', err);
    } finally {
      setPendingVote(null);
    }
  }

  async function onCancel(): Promise<void> {
    if (!proposalId) return;
    setIsCancelling(true);
    try {
      const updated = await cancelProposal(proposalId);
      setProposal(updated);
      showSuccessToast('Proposal cancelled');
    } catch (err) {
      showErrorToast('Failed to cancel proposal', err);
    } finally {
      setIsCancelling(false);
    }
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
          { label: 'Proposals', to: `/projects/${projectId}/proposals` },
          { label: shortenPrincipal(proposalId) },
        ]}
      />
      <div className="mt-3 flex items-center gap-3">
        <H1>Proposal</H1>
        {proposal && <ProposalStatusBadge status={proposal.status} />}
      </div>

      {isLoading && !proposal ? (
        <p className="text-muted-foreground mt-6 text-sm">Loading…</p>
      ) : !proposal ? (
        <p className="text-muted-foreground mt-6 text-sm">
          Proposal not found.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Operation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">
                  {proposalOperationLabel(proposal.operation)}
                </p>
                <p className="text-muted-foreground">
                  {describeOperation(proposal)}
                </p>
              </div>
              <dl className="grid gap-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Proposer</dt>
                  <dd className="font-mono text-xs">{proposal.proposerId}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono text-xs">{proposal.id}</dd>
                </div>
                {status?.kind === ProposalStatusKind.Failed && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="text-destructive max-w-[60%] text-right text-xs">
                      {status.message}
                    </dd>
                  </div>
                )}
              </dl>

              {(canVote || canCancel) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {canVote && (
                    <>
                      <LoadingButton
                        size="sm"
                        isLoading={pendingVote === Vote.Approve}
                        disabled={pendingVote !== null || isCancelling}
                        onClick={() => onVote(Vote.Approve)}
                      >
                        Approve
                      </LoadingButton>
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        isLoading={pendingVote === Vote.Reject}
                        disabled={pendingVote !== null || isCancelling}
                        onClick={() => onVote(Vote.Reject)}
                      >
                        Reject
                      </LoadingButton>
                    </>
                  )}
                  {canCancel && (
                    <LoadingButton
                      size="sm"
                      variant="destructive"
                      isLoading={isCancelling}
                      disabled={isCancelling || pendingVote !== null}
                      onClick={onCancel}
                    >
                      Cancel proposal
                    </LoadingButton>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {isPendingApproval && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Approvals{' '}
                  <span className="text-muted-foreground text-sm font-normal">
                    {status.votes.filter(v => v.vote === Vote.Approve).length}
                    {' / '}
                    {status.threshold}
                  </span>
                  <span className="text-muted-foreground ml-3 text-sm font-normal">
                    Rejections{' '}
                    {status.votes.filter(v => v.vote === Vote.Reject).length}
                    {' / '}
                    {Math.max(status.approvers.length - status.threshold, 0)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Approver</TableHead>
                      <TableHead className="text-right">Vote</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.approvers.map(principal => {
                      const vote =
                        status.votes.find(v => v.voter === principal)?.vote ??
                        null;
                      return (
                        <TableRow key={principal}>
                          <TableCell>
                            <span className="text-sm">
                              {renderProfileLabel(
                                principal,
                                profileMap.get(principal) ?? null,
                              )}
                            </span>
                            {principal === myPrincipal && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (you)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {vote === Vote.Approve ? (
                              <Badge variant="success">Approved</Badge>
                            ) : vote === Vote.Reject ? (
                              <Badge variant="destructive">Rejected</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
};

export default ProposalDetail;
