import { H1 } from '@/components/typography/h1';
import { H2 } from '@/components/typography/h2';
import { useRequireAdminAuth } from '@/lib/auth';
import { TrustedPartnerForm } from '@/routes/admin/trusted-partner-form';
import { TrustedPartnerTable } from '@/routes/admin/trusted-partner-table';
import { UserTable } from '@/routes/admin/user-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserStatus } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { type FC, useMemo } from 'react';

const Admin: FC = () => {
  useRequireAdminAuth();

  const { users } = useAppStore();

  const userStats = useMemo(() => {
    if (!users) {
      return { total: 0, active: 0, inactive: 0 };
    }

    const total = users.length;
    const active = users.filter(u => u.status === UserStatus.Active).length;
    const inactive = users.filter(u => u.status === UserStatus.Inactive).length;

    return { total, active, inactive };
  }, [users]);

  return (
    <>
      <H1>Admin</H1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{userStats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              All registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {userStats.active}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Users with active status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive Users</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {userStats.inactive}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Users with inactive status
            </p>
          </CardContent>
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
