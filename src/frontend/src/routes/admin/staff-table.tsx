import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { StaffPermissionBadges } from '@/routes/admin/staff-permission-badges';
import { StaffRevokeButton } from '@/routes/admin/staff-revoke-button';
import type { FC } from 'react';

export type StaffTableProps = {
  className?: string;
};

export const StaffTable: FC<StaffTableProps> = ({ className }) => {
  const { staff } = useAppStore();

  if (staff !== null && staff.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No staff members yet. Use the form below to grant permissions.
      </p>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1">User ID</TableHead>

          <TableHead>Email</TableHead>

          <TableHead>Permissions</TableHead>

          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {staff?.map(member => (
          <TableRow key={member.userId}>
            <TableCell className="font-mono text-xs">{member.userId}</TableCell>

            <TableCell>
              <div className="flex items-center gap-2">
                <span>{member.email ?? 'None provided'}</span>
                {member.email && (
                  <Badge
                    variant={member.emailVerified ? 'success' : 'secondary'}
                  >
                    {member.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                )}
              </div>
            </TableCell>

            <TableCell>
              <StaffPermissionBadges permissions={member.permissions} />
            </TableCell>

            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <StaffRevokeButton userId={member.userId} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
