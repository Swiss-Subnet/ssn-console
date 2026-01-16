import { H1 } from '@/components/typography/h1';
import { H2 } from '@/components/typography/h2';
import { useRequireAdminAuth } from '@/lib/auth';
import { TrustedPartnerForm } from '@/routes/admin/trusted-partner-form';
import { TrustedPartnerTable } from '@/routes/admin/trusted-partner-table';
import { UserTable } from '@/routes/admin/user-table';
import { type FC } from 'react';

const Admin: FC = () => {
  useRequireAdminAuth();

  return (
    <>
      <H1>Admin</H1>

      <H2 className="mt-10">Users</H2>
      <UserTable className="mt-3" />

      <H2 className="mt-10">Trusted Partners</H2>
      <TrustedPartnerTable className="mt-3" />
      <TrustedPartnerForm className="mt-12" />
    </>
  );
};

export default Admin;
