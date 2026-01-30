import { H1 } from '@/components/typography/h1';
import { H2 } from '@/components/typography/h2';
import { useRequireAdminAuth } from '@/lib/auth';
import { TrustedPartnerForm } from '@/routes/admin/trusted-partner-form';
import { TrustedPartnerTable } from '@/routes/admin/trusted-partner-table';
import { UserTable } from '@/routes/admin/user-table';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { type FC, useEffect } from 'react';

const Admin: FC = () => {
  useRequireAdminAuth();

  const { userStats, fetchUserStats } = useAppStore();

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return (
    <>
      <H1>Admin</H1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{userStats?.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {userStats?.active ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive Users</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {userStats?.inactive ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <H2 className="mt-10">Users</H2>
      <UserTable className="mt-3" />
      <H2 className="mt-10">Trusted Partners</H2>
      <TrustedPartnerTable className="mt-3" />
      <TrustedPartnerForm className="mt-12" />
    </>
  );
};

export default Admin;
