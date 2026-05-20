import { Badge } from '@/components/ui/badge';
import type { StaffPermissions } from '@/lib/api-models';
import type { FC } from 'react';

export type StaffPermissionBadgesProps = {
  permissions: StaffPermissions;
};

export const StaffPermissionBadges: FC<StaffPermissionBadgesProps> = ({
  permissions,
}) => (
  <div className="flex flex-wrap gap-1">
    {permissions.readAllOrgs && (
      <Badge variant="secondary">Read all orgs</Badge>
    )}
    {permissions.writeBilling && (
      <Badge variant="secondary">Write billing</Badge>
    )}
    {permissions.manageUsers && <Badge variant="secondary">Manage users</Badge>}
    {permissions.readMetrics && <Badge variant="secondary">Read metrics</Badge>}
    {!permissions.readAllOrgs &&
      !permissions.writeBilling &&
      !permissions.manageUsers &&
      !permissions.readMetrics && <Badge variant="outline">None</Badge>}
  </div>
);
