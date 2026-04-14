import { useRequireAuth } from '@/lib/auth';
import type { FC } from 'react';
import { Outlet } from 'react-router';

export const ProtectedRoute: FC = () => {
  useRequireAuth();
  return <Outlet />;
};
