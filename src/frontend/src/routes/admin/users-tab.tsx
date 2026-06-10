import { useRequireAdminCapability } from '@/lib/auth';
import { selectCanManageUsers, useAppStore } from '@/lib/store';
import { UserTable } from '@/routes/admin/user-table';
import { type FC } from 'react';

const UsersTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectCanManageUsers));
  return <UserTable />;
};

export default UsersTab;
