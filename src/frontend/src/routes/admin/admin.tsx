import { H1 } from '@/components/typography/h1';
import { H2 } from '@/components/typography/h2';
import { useRequireAdminAuth } from '@/lib/auth';
import { UserTable } from '@/routes/admin/user-table';
import { type FC } from 'react';

const Admin: FC = () => {
  useRequireAdminAuth();

  return (
    <>
      <H1>Admin</H1>

      <H2 className="mt-10">Users</H2>
      <UserTable className="mt-3" />
    </>
  );
};

export default Admin;
