import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { CanisterGrid } from '@/routes/canisters/canister-grid';
import { CreateCanisterButton } from '@/routes/canisters/create-canister-button';
import { type FC } from 'react';

const Canisters: FC = () => {
  useRequireAuth();

  return (
    <>
      <H1>Canisters</H1>
      <CanisterGrid className="mt-8" />
      <CreateCanisterButton className="mt-4" />
    </>
  );
};

export default Canisters;
