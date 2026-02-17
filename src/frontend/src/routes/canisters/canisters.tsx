import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { CanisterGrid } from '@/routes/canisters/canister-grid';
import { CreateCanisterButton } from '@/routes/canisters/create-canister-button';
import { type FC } from 'react';
import { CanisterSkeleton } from '@/routes/canisters/canister-skeleton';

const Canisters: FC = () => {
  useRequireAuth();
  const { isCanistersLoading } = useAppStore();

  return (
    <>
      <H1>Canisters</H1>
      {isCanistersLoading ? (
        <CanisterSkeleton className="mt-8" />
      ) : (
        <>
          <CanisterGrid className="mt-8" />
          <CreateCanisterButton className="mt-4" />
        </>
      )}
    </>
  );
};

export default Canisters;
