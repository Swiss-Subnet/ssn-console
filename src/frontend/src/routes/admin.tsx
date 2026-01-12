import { H1 } from '@/components/typography/h1';
import { useRequireAdminAuth } from '@/lib/auth';
import { type FC } from 'react';

const Admin: FC = () => {
  useRequireAdminAuth();

  return (
    <>
      <H1>Admin</H1>
    </>
  );
};

export default Admin;
