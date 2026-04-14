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
import { useRequireAuth } from '@/lib/auth';
import {
  CanisterStatus,
  type CanisterChange,
  type CanisterInfo,
} from '@/lib/api-models';
import {
  formatBytes,
  formatHex,
  formatNumber,
  formatTimestamp,
} from '@/lib/format';
import { isNil } from '@/lib/nil';
import { useRequireProjectId, useRequireCanisterId } from '@/lib/params';
import { selectOrgMap, selectProjectMap, useAppStore } from '@/lib/store';
import { AddControllerForm } from '@/routes/canisters/add-controller-form';
import { AddMissingCanisterControllerCta } from '@/routes/canisters/add-missing-canister-controller-cta';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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
  title: string;
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

type CanisterInfoSectionsProps = {
  canisterPrincipal: string;
  info: CanisterInfo;
};

const CanisterInfoSections: FC<CanisterInfoSectionsProps> = ({
  canisterPrincipal,
  info,
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
              {info.settings.controllers.map(c => (
                <p
                  key={c}
                  className="text-muted-foreground font-mono text-xs break-all"
                >
                  {c}
                </p>
              ))}
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

function changeOriginLabel(change: CanisterChange): string {
  if (change.origin === null) return '';
  if (change.origin.type === 'user') return change.origin.userId;
  return change.origin.canisterId;
}

type CanisterHistoryProps = { canisterPrincipal: string };

const CanisterHistory: FC<CanisterHistoryProps> = ({ canisterPrincipal }) => {
  const { canisterHistoryApi } = useAppStore();
  const [changes, setChanges] = useState<CanisterChange[] | null>(null);

  useEffect(() => {
    canisterHistoryApi
      .listCanisterChanges(canisterPrincipal)
      .then(res => setChanges(res.changes))
      .catch(() => setChanges([]));
  }, [canisterPrincipal]);

  return (
    <SectionCard title="History">
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
                {change.origin !== null && (
                  <span className="text-muted-foreground ml-1.5 font-mono">
                    {changeOriginLabel(change)}
                  </span>
                )}
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

const CanisterDetail: FC = () => {
  useRequireAuth();
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

  const project = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );

  const organization = useMemo(
    () => (project ? (orgMap.get(project.orgId) ?? null) : null),
    [project, orgMap],
  );

  const isLoading = isCanistersLoading || !isCanistersInitialized;

  const canisterLabel = canister
    ? `${canister.principal.slice(0, 5)}...${canister.principal.slice(-3)}`
    : 'Canister';

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/canisters' },
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
        <H1>Canister</H1>
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
            {canister.info && (
              <Badge variant={statusBadgeVariant(canister.info.status)}>
                {canister.info.status}
              </Badge>
            )}
          </div>

          {isNil(canister.info) ? (
            <AddMissingCanisterControllerCta canisterId={canister.principal} />
          ) : (
            <CanisterInfoSections
              canisterPrincipal={canister.principal}
              info={canister.info}
            />
          )}
          <CanisterHistory canisterPrincipal={canister.principal} />
        </div>
      )}
    </>
  );
};

export default CanisterDetail;
