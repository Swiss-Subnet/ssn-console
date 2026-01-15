import { H1 } from '@/components/typography/h1';
import { H2 } from '@/components/typography/h2';
import { useRequireAuth } from '@/lib/auth';
import { CanisterGrid } from '@/routes/console/canister-grid';
import { CreateCanisterButton } from '@/routes/console/create-canister-button';
import { type FC } from 'react';

const Console: FC = () => {
  useRequireAuth();

  return (
    <>
      <H1>Console</H1>

      <H2 className="mt-10">Canisters</H2>
      <CanisterGrid className="mt-3" />
      <CreateCanisterButton className="mt-5" />
    </>
  );
};

export default Console;
