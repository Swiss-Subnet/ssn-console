import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { CanisterGrid } from '@/routes/canisters/canister-grid';
import { CreateCanisterButton } from '@/routes/canisters/create-canister-button';
import { useEffect, useMemo, type FC } from 'react';
import { CanisterSkeleton } from '@/routes/canisters/canister-skeleton';
import { isNil } from '@/lib/nil';
import { useRequireProjectId } from '@/lib/params';

const Canisters: FC = () => {
  useRequireAuth();
  const { isCanistersLoading, initializeCanisters, canisters } = useAppStore();
  const projectId = useRequireProjectId();

  useEffect(() => {
    initializeCanisters(projectId);
  }, [projectId]);

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
      <H1>Canisters</H1>
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
