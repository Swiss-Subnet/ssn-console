import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';

const AdminOverview: FC = () => {
  const { userStats } = useAppStore();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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
  );
};

export default AdminOverview;
