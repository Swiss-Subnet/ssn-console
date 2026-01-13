import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { UserStatusBadge } from '@/routes/admin/user-status-badge';
import { UserStatusToggle } from '@/routes/admin/user-status-toggle';
import { type FC } from 'react';

export type AdminUserTableProps = {
  className?: string;
};

export const UserTable: FC<AdminUserTableProps> = ({ className }) => {
  const { users } = useAppStore();

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1">#</TableHead>

          <TableHead>Email</TableHead>

          <TableHead>Status</TableHead>

          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {users?.map(user => (
          <TableRow key={user.id}>
            <TableCell>{user.id}</TableCell>

            <TableCell>{user.email ?? 'None provided'}</TableCell>

            <TableCell>
              <UserStatusBadge user={user} />
            </TableCell>

            <TableCell>
              <UserStatusToggle user={user} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
