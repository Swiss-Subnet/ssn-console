import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { CanisterAvailability, CanisterStatus } from '@/lib/api-models';
import { formatBytes, formatCycles } from '@/lib/format';
import { isNotNil } from '@/lib/nil';
import { selectOrgsWithProjects, useAppStore } from '@/lib/store';
import { Link } from 'react-router';
import { useEffect, useMemo, type FC } from 'react';

type StatRowProps = { label: string; value: string };

const StatRow: FC<StatRowProps> = ({ label, value }) => (
  <div className="flex justify-between py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const Dashboard: FC = () => {
  const { organizations, projects, teams, canisters, initializeCanisters } =
    useAppStore();
  const orgsWithProjects = useAppStore(selectOrgsWithProjects);

  const defaultProject = projects[0];
  const defaultProjectId = defaultProject?.id;

  useEffect(() => {
    if (isNotNil(defaultProjectId)) {
      initializeCanisters(defaultProjectId);
    }
  }, [defaultProjectId, initializeCanisters]);

  const defaultCanisters = useMemo(
    () =>
      isNotNil(defaultProjectId)
        ? (canisters?.get(defaultProjectId) ?? [])
        : [],
    [canisters, defaultProjectId],
  );

  const canisterStats = useMemo(() => {
    let running = 0;
    let stopping = 0;
    let stopped = 0;
    let totalCycles = 0n;
    let totalIdleBurn = 0n;
    let totalMemory = 0n;
    let withInfo = 0;

    for (const canister of defaultCanisters) {
      if (canister.state.availability !== CanisterAvailability.Accessible)
        continue;
      const { info } = canister.state;
      withInfo += 1;
      totalCycles += info.cycles;
      totalIdleBurn += info.idleCyclesBurnedPerDay;
      totalMemory += info.memorySize;
      if (info.status === CanisterStatus.Running) running += 1;
      else if (info.status === CanisterStatus.Stopping) stopping += 1;
      else if (info.status === CanisterStatus.Stopped) stopped += 1;
    }

    return {
      total: defaultCanisters.length,
      withInfo,
      running,
      stopping,
      stopped,
      totalCycles,
      totalIdleBurn,
      totalMemory,
    };
  }, [defaultCanisters]);

  const daysOfRuntime = useMemo(() => {
    if (canisterStats.totalIdleBurn === 0n) return null;
    const days =
      Number(canisterStats.totalCycles) / Number(canisterStats.totalIdleBurn);
    if (!Number.isFinite(days)) return null;
    return days;
  }, [canisterStats]);

  return (
    <Container>
      <H1>Dashboard</H1>

      <Alert className="mt-6">
        <Sparkles />
        <AlertTitle>Work in progress</AlertTitle>
        <AlertDescription>
          This is an early view of your workspace. Richer metrics, activity, and
          team insights are on the way.
        </AlertDescription>
      </Alert>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Footprint</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow
              label="Organizations"
              value={organizations.length.toString()}
            />
            <StatRow label="Projects" value={projects.length.toString()} />
            <StatRow label="Teams" value={teams.length.toString()} />
            <StatRow label="Canisters" value={canisterStats.total.toString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canisters</CardTitle>
          </CardHeader>
          <CardContent>
            {canisterStats.withInfo === 0 ? (
              <p className="text-muted-foreground text-sm">
                No canister metrics available yet.
              </p>
            ) : (
              <>
                <StatRow
                  label="Running"
                  value={`${canisterStats.running} / ${canisterStats.withInfo}`}
                />
                {canisterStats.stopping > 0 && (
                  <StatRow
                    label="Stopping"
                    value={canisterStats.stopping.toString()}
                  />
                )}
                {canisterStats.stopped > 0 && (
                  <StatRow
                    label="Stopped"
                    value={canisterStats.stopped.toString()}
                  />
                )}
                <StatRow
                  label="Total Cycles"
                  value={formatCycles(canisterStats.totalCycles)}
                />
                <StatRow
                  label="Idle Burn / Day"
                  value={formatCycles(canisterStats.totalIdleBurn)}
                />
                {daysOfRuntime !== null && (
                  <StatRow
                    label="Idle Runtime"
                    value={`~${daysOfRuntime.toFixed(0)} days`}
                  />
                )}
                <StatRow
                  label="Memory"
                  value={formatBytes(canisterStats.totalMemory)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {orgsWithProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                You don't belong to any organizations yet.
              </p>
            ) : (
              <ul className="divide-y">
                {orgsWithProjects.map(org => (
                  <li
                    key={org.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <Link
                      to={`/organizations/${org.id}/settings`}
                      className="hover:text-foreground font-medium transition-colors"
                    >
                      {org.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {org.projects.length}{' '}
                      {org.projects.length === 1 ? 'project' : 'projects'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default Dashboard;
