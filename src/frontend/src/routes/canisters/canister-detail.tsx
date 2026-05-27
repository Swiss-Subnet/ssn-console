import { H1 } from '@/components/typography/h1';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import {
  CanisterAvailability,
  CanisterStatus,
  type Canister,
  type CanisterChange,
  type CanisterInfo,
} from '@/lib/api-models';
import {
  formatBytes,
  formatHex,
  formatNumber,
  formatTimestamp,
} from '@/lib/format';
import { BACKEND_CANISTER_ID } from '@/env';
import { isNil } from '@/lib/nil';
import { useRequireProjectId, useRequireCanisterId } from '@/lib/params';
import { selectOrgMap, selectProjectMap, useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { UserProfileBrief } from '@/lib/api-models/user-profile';
import { AddControllerForm } from '@/routes/canisters/add-controller-form';
import { AddMissingCanisterControllerCta } from '@/routes/canisters/add-missing-canister-controller-cta';
import { DeletedCanisterCta } from '@/routes/canisters/deleted-canister-cta';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { UsageMetricsGrid } from '@/components/usage-metrics-grid';
import { type ProjectUsage } from '@/lib/api-models';
import { useEffect, useMemo, useState, type FC } from 'react';

function statusBadgeVariant(
  status: CanisterStatus,
): 'success' | 'outline' | 'destructive' {
  switch (status) {
    case CanisterStatus.Running:
      return 'success';
    case CanisterStatus.Stopping:
      return 'outline';
    case CanisterStatus.Stopped:
      return 'destructive';
  }
}

type StatRowProps = { label: string; value: string };

const StatRow: FC<StatRowProps> = ({ label, value }) => (
  <div className="flex justify-between py-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

type SectionCardProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const SectionCard: FC<SectionCardProps> = ({ title, children, footer }) => (
  <Card size="sm">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);

type RenameCanisterCardProps = { canister: Canister; projectId: string };

const RenameCanisterCard: FC<RenameCanisterCardProps> = ({
  canister,
  projectId,
}) => {
  const updateCanisterName = useAppStore(s => s.updateCanisterName);
  const [draft, setDraft] = useState(canister.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setDraft(canister.name ?? '');
  }, [canister.name]);

  const trimmed = draft.trim();
  const hasChanges = trimmed !== (canister.name ?? '');
  const canSave = hasChanges && trimmed.length > 0;

  async function onSave(): Promise<void> {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await updateCanisterName(canister.id, projectId, trimmed);
      showSuccessToast('Canister name updated');
    } catch (err) {
      showErrorToast('Failed to update canister name', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function onClear(): Promise<void> {
    setIsClearing(true);
    try {
      await updateCanisterName(canister.id, projectId, null);
      showSuccessToast('Canister name cleared');
    } catch (err) {
      showErrorToast('Failed to clear canister name', err);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <SectionCard title="Name">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          placeholder="Unnamed canister"
          maxLength={100}
          onChange={e => setDraft(e.target.value)}
          disabled={isSaving || isClearing}
        />
        <div className="flex gap-2">
          <LoadingButton
            isLoading={isSaving}
            disabled={!canSave || isClearing}
            onClick={onSave}
          >
            Save
          </LoadingButton>
          {canister.name !== null && (
            <LoadingButton
              variant="ghost"
              isLoading={isClearing}
              disabled={isSaving}
              onClick={onClear}
            >
              Clear
            </LoadingButton>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

type CanisterInfoSectionsProps = {
  canisterPrincipal: string;
  projectPrincipal: string;
  info: CanisterInfo;
  controllerNames: Map<string, string>;
};

const CanisterInfoSections: FC<CanisterInfoSectionsProps> = ({
  canisterPrincipal,
  projectPrincipal,
  info,
  controllerNames,
}) => {
  const logVisibilityLabel =
    typeof info.settings.logVisibility === 'string'
      ? info.settings.logVisibility === 'controllers'
        ? 'Controllers only'
        : 'Public'
      : `${info.settings.logVisibility.length} allowed viewer(s)`;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Settings"
        footer={<AddControllerForm canisterId={canisterPrincipal} />}
      >
        <StatRow
          label="Compute Allocation"
          value={
            info.settings.computeAllocation === 0n
              ? 'Best effort'
              : `${info.settings.computeAllocation}%`
          }
        />
        <StatRow
          label="Memory Allocation"
          value={
            info.settings.memoryAllocation === 0n
              ? 'Unlimited'
              : formatBytes(info.settings.memoryAllocation)
          }
        />
        <StatRow label="Log Visibility" value={logVisibilityLabel} />
        <StatRow
          label="Wasm Memory Limit"
          value={
            info.settings.wasmMemoryLimit === 0n
              ? 'Unlimited'
              : formatBytes(info.settings.wasmMemoryLimit)
          }
        />
        <StatRow
          label="Wasm Memory Threshold"
          value={
            info.settings.wasmMemoryThreshold === 0n
              ? 'None'
              : formatBytes(info.settings.wasmMemoryThreshold)
          }
        />

        <div className="mt-3">
          <div className="mb-1 text-xs font-medium">Controllers</div>
          {info.settings.controllers.length > 0 ? (
            <div className="flex flex-col gap-1">
              {info.settings.controllers.map(c => {
                const name = controllerNames.get(c);
                return (
                  <p
                    key={c}
                    className="text-muted-foreground text-xs break-all"
                  >
                    {name !== undefined && (
                      <span className="text-foreground font-medium">
                        {name}{' '}
                      </span>
                    )}
                    <span className="font-mono">
                      {name !== undefined ? `(${c})` : c}
                    </span>
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No controllers.</p>
          )}
        </div>

        {info.settings.environmentVariables.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium">
              Environment Variables
            </div>
            <div className="flex flex-col gap-1">
              {info.settings.environmentVariables.map(env => (
                <div key={env.name} className="flex justify-between text-xs">
                  <span className="font-medium">{env.name}</span>
                  <span className="text-muted-foreground font-mono">
                    {env.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Overview">
        <StatRow label="Status" value={info.status} />
        <StatRow label="Version" value={info.version.toString()} />
        <StatRow
          label="Module Hash"
          value={
            isNil(info.moduleHash)
              ? 'None'
              : formatHex(info.moduleHash).slice(0, 16) + '...'
          }
        />
        <StatRow
          label="Ready for Migration"
          value={info.readyForMigration ? 'Yes' : 'No'}
        />
      </SectionCard>

      <CanisterUsageMetrics
        projectId={projectPrincipal}
        canisterId={canisterPrincipal}
      />

      <SectionCard title="Memory">
        <StatRow label="Total" value={formatBytes(info.memorySize)} />
        <StatRow
          label="Wasm"
          value={formatBytes(info.memoryMetrics.wasmMemorySize)}
        />
        <StatRow
          label="Stable"
          value={formatBytes(info.memoryMetrics.stableMemorySize)}
        />
        <StatRow
          label="Global"
          value={formatBytes(info.memoryMetrics.globalMemorySize)}
        />
        <StatRow
          label="Wasm Binary"
          value={formatBytes(info.memoryMetrics.wasmBinarySize)}
        />
        <StatRow
          label="Custom Sections"
          value={formatBytes(info.memoryMetrics.customSectionsSize)}
        />
        <StatRow
          label="Canister History"
          value={formatBytes(info.memoryMetrics.canisterHistorySize)}
        />
        <StatRow
          label="Chunk Store"
          value={formatBytes(info.memoryMetrics.wasmChunkStoreSize)}
        />
        <StatRow
          label="Snapshots"
          value={formatBytes(info.memoryMetrics.snapshotsSize)}
        />
      </SectionCard>

      <SectionCard title="Query Stats">
        <StatRow
          label="Total Calls"
          value={formatNumber(info.queryStats.numCallsTotal)}
        />
        <StatRow
          label="Total Instructions"
          value={formatNumber(info.queryStats.numInstructionsTotal)}
        />
        <StatRow
          label="Request Bytes"
          value={formatBytes(info.queryStats.requestPayloadBytesTotal)}
        />
        <StatRow
          label="Response Bytes"
          value={formatBytes(info.queryStats.responsePayloadBytesTotal)}
        />
      </SectionCard>
    </div>
  );
};

function changeLabel(change: CanisterChange): string {
  if (change.details === null) return 'Unknown';
  switch (change.details.type) {
    case 'creation':
      return 'Created';
    case 'codeUninstall':
      return 'Code Uninstall';
    case 'codeDeployment': {
      const mode = change.details.mode;
      if (mode === 'install') return 'Code Install';
      if (mode === 'reinstall') return 'Code Reinstall';
      if (mode === 'upgrade') return 'Code Upgrade';
      return 'Code Deployment';
    }
    case 'controllersChange':
      return 'Controllers Changed';
    case 'loadSnapshot':
      return 'Snapshot Loaded';
  }
}

type CanisterHistoryProps = {
  canisterPrincipal: string;
  canisterNames: Map<string, string>;
};

const CanisterHistory: FC<CanisterHistoryProps> = ({
  canisterPrincipal,
  canisterNames,
}) => {
  const { canisterHistoryApi } = useAppStore();
  const [changes, setChanges] = useState<CanisterChange[] | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    canisterHistoryApi
      .listCanisterChanges(canisterPrincipal)
      .then(res => {
        setChanges(res.changes);
        setIsDeleted(res.isDeleted);
      })
      .catch(() => setChanges([]));
  }, [canisterPrincipal]);

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2">
          History
          {isDeleted && <Badge variant="destructive">Deleted</Badge>}
        </div>
      }
    >
      {changes === null ? (
        <p className="text-muted-foreground text-xs">Loading...</p>
      ) : changes.length === 0 ? (
        <p className="text-muted-foreground text-xs">No history available.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {changes.map(change => (
            <div
              key={change.id}
              className="flex items-start justify-between gap-2 py-1 text-xs"
            >
              <div>
                <span className="font-medium">{changeLabel(change)}</span>
                {change.origin !== null &&
                  (() => {
                    const id =
                      change.origin.type === 'user'
                        ? change.origin.userId
                        : change.origin.canisterId;
                    const name =
                      change.origin.type === 'canister'
                        ? canisterNames.get(id)
                        : undefined;
                    return (
                      <span className="text-muted-foreground ml-1.5">
                        {name !== undefined && (
                          <span className="font-medium">{name} </span>
                        )}
                        <span className="font-mono">
                          {name !== undefined ? `(${id})` : id}
                        </span>
                      </span>
                    );
                  })()}
              </div>
              <div className="text-muted-foreground shrink-0 text-right">
                <div>{formatTimestamp(change.timestampNanos)}</div>
                <div>v{change.canisterVersion.toString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const CanisterUsageMetrics: FC<{ projectId: string; canisterId: string }> = ({
  projectId,
  canisterId,
}) => {
  const { usageApi } = useAppStore();
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    usageApi
      .getUsage({ projectId, billingMonth: null })
      .then(res => {
        const cUsage = res.canisters.find(c => c.canisterId === canisterId);
        if (cUsage) {
          setUsage({
            memory: cUsage.memory,
            memoryBytes: cUsage.memoryBytes,
            computeAllocation: cUsage.computeAllocation,
            computeAllocationPercent: cUsage.computeAllocationPercent,
            ingressInduction: cUsage.ingressInduction,
            ingressInductionBytesTotal: cUsage.ingressInductionBytesTotal,
            instructions: cUsage.instructions,
            computeTimeSecondsTotal: cUsage.computeTimeSecondsTotal,
            requestAndResponseTransmission:
              cUsage.requestAndResponseTransmission,
            transmissionBytesTotal: cUsage.transmissionBytesTotal,
            uninstall: cUsage.uninstall,
            uninstallsTotal: cUsage.uninstallsTotal,
            httpOutcalls: cUsage.httpOutcalls,
            burnedCycles: cUsage.burnedCycles,
          });
        } else {
          setUsage(null);
        }
      })
      .catch(err => {
        showErrorToast('Failed to load canister usage metrics', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId, canisterId, usageApi]);

  return (
    <SectionCard title="Usage Metrics">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <RefreshCw className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : usage ? (
        <UsageMetricsGrid usage={usage} />
      ) : (
        <p className="text-muted-foreground text-sm">
          No usage metrics available for this canister.
        </p>
      )}
    </SectionCard>
  );
};

const CanisterDetail: FC = () => {
  const {
    isCanistersLoading,
    isCanistersInitialized,
    initializeCanisters,
    refreshCanisters,
    canisters,
  } = useAppStore();
  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);
  const projectId = useRequireProjectId();
  const canisterId = useRequireCanisterId();

  useEffect(() => {
    initializeCanisters(projectId);
  }, [projectId]);

  const canister = useMemo(
    () => canisters?.get(projectId)?.find(c => c.id === canisterId) ?? null,
    [canisters, projectId, canisterId],
  );

  const getUserProfilesByPrincipals = useAppStore(
    s => s.getUserProfilesByPrincipals,
  );
  const [userProfiles, setUserProfiles] = useState<
    Map<string, UserProfileBrief | null>
  >(new Map());

  const controllerPrincipals = useMemo(() => {
    if (canister?.state.availability !== CanisterAvailability.Accessible) {
      return [] as string[];
    }
    return canister.state.info.settings.controllers;
  }, [canister]);

  useEffect(() => {
    const unknown = controllerPrincipals.filter(p => !userProfiles.has(p));
    if (unknown.length === 0) return;
    getUserProfilesByPrincipals(projectId, unknown)
      .then(entries => {
        setUserProfiles(prev => {
          const next = new Map(prev);
          for (const e of entries) next.set(e.principal, e.profile);
          return next;
        });
      })
      .catch(err =>
        showErrorToast('Failed to resolve controller profiles', err),
      );
  }, [controllerPrincipals, projectId, getUserProfilesByPrincipals]);

  const controllerNames = useMemo(() => {
    const map = new Map<string, string>();
    map.set(BACKEND_CANISTER_ID, 'Swiss Subnet Console');
    for (const c of canisters?.get(projectId) ?? []) {
      if (c.name !== null) map.set(c.principal, c.name);
    }
    for (const [principal, profile] of userProfiles) {
      if (map.has(principal)) continue;
      if (profile?.email) map.set(principal, profile.email);
    }
    return map;
  }, [canisters, projectId, userProfiles]);

  const project = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );

  const organization = useMemo(
    () => (project ? (orgMap.get(project.orgId) ?? null) : null),
    [project, orgMap],
  );

  const isLoading = isCanistersLoading || !isCanistersInitialized;

  const canisterLabel =
    canister?.name ??
    (canister
      ? `${canister.principal.slice(0, 5)}...${canister.principal.slice(-3)}`
      : 'Canister');

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
          {
            label: project?.name ?? 'Project',
            to: `/projects/${projectId}/canisters`,
          },
          { label: canisterLabel },
        ]}
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <H1 className="truncate">{canister?.name ?? 'Canister'}</H1>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isCanistersLoading}
          onClick={() => refreshCanisters(projectId)}
        >
          <RefreshCw className={isCanistersLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isNil(canister) ? (
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Canister not found.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1">
            <p className="text-center font-mono text-xs break-all">
              {canister.principal}
            </p>
            {canister.state.availability ===
              CanisterAvailability.Accessible && (
              <Badge variant={statusBadgeVariant(canister.state.info.status)}>
                {canister.state.info.status}
              </Badge>
            )}
            {canister.state.availability === CanisterAvailability.Deleted && (
              <Badge variant="destructive">Deleted</Badge>
            )}
          </div>

          <RenameCanisterCard canister={canister} projectId={projectId} />

          {canister.state.availability === CanisterAvailability.Accessible ? (
            <CanisterInfoSections
              canisterPrincipal={canister.principal}
              projectPrincipal={projectId}
              info={canister.state.info}
              controllerNames={controllerNames}
            />
          ) : canister.state.availability === CanisterAvailability.Deleted ? (
            <DeletedCanisterCta
              canisterRecordId={canister.id}
              canisterPrincipal={canister.principal}
            />
          ) : (
            <AddMissingCanisterControllerCta canisterId={canister.principal} />
          )}
          <CanisterHistory
            canisterPrincipal={canister.principal}
            canisterNames={controllerNames}
          />
        </div>
      )}
    </>
  );
};

export default CanisterDetail;
