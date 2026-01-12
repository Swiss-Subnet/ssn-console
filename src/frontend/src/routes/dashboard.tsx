import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { type FC } from 'react';

export const Dashboard: FC = () => {
  useRequireAuth();

  return <H1>Dashboard</H1>;
};
