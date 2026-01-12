import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { useAppState } from '@/lib/state';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { type FC } from 'react';

export const Dashboard: FC = () => {
  useRequireAuth();
  const state = useAppState();
  const { identity } = useInternetIdentity();

  return (
    <>
      <H1>Dashboard</H1>

      <div className="mt-20">ID: {state.profile?.id}</div>
      <div>Principal: {identity?.getPrincipal().toText()}</div>
    </>
  );
};
