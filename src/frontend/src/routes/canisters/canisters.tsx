import { H1 } from '@/components/typography/h1';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { selectOrgMap, selectProjectMap, useAppStore } from '@/lib/store';
import { CanisterGrid } from '@/routes/canisters/canister-grid';
import { CreateCanisterButton } from '@/routes/canisters/create-canister-button';
import { useEffect, useMemo, type FC } from 'react';
import { CanisterSkeleton } from '@/routes/canisters/canister-skeleton';
import { isNil } from '@/lib/nil';
import { useRequireProjectId } from '@/lib/params';

const Canisters: FC = () => {
  const { isCanistersLoading, initializeCanisters, canisters } = useAppStore();
  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);
  const projectId = useRequireProjectId();

  useEffect(() => {
    initializeCanisters(projectId);
  }, [projectId]);

  const project = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );

  const organization = useMemo(
    () => (project ? (orgMap.get(project.orgId) ?? null) : null),
    [project, orgMap],
  );

  const projectCanisterMap = useMemo(
    () => canisters?.get(projectId) ?? null,
    [projectId, canisters],
  );

  const projectCanisters = useMemo(
    () => projectCanisterMap?.values().toArray() ?? null,
    [projectCanisterMap],
  );

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
          { label: project?.name ?? 'Project' },
        ]}
      />
      <H1 className="mt-3">Canisters</H1>
      {isCanistersLoading || isNil(projectCanisters) ? (
        <CanisterSkeleton className="mt-8" />
      ) : (
        <>
          <CanisterGrid className="mt-8" canisters={projectCanisters} />
          <CreateCanisterButton className="mt-4" />
        </>
      )}
    </>
  );
};

export default Canisters;
