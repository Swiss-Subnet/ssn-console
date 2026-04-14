import { useRequireAdminAuth } from '@/lib/auth';
import type { FC } from 'react';
import { Outlet } from 'react-router';

export const AdminRoute: FC = () => {
  useRequireAdminAuth();
  return <Outlet />;
};
