import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Link } from 'react-router';

export type UserTableProps = {
  className?: string;
};

export const UserTable: FC<UserTableProps> = ({ className }) => {
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

            <TableCell>
              <div className="flex items-center gap-2">
                <span>{user.email ?? 'None provided'}</span>
                {user.email && (
                  <Badge variant={user.emailVerified ? 'success' : 'secondary'}>
                    {user.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                )}
              </div>
            </TableCell>

            <TableCell>
              <UserStatusBadge user={user} />
            </TableCell>

            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Link to={`/admin/users/${user.id}/canisters`}>
                  <Button variant="outline" size="sm">
                    View Canisters
                  </Button>
                </Link>
                <UserStatusToggle user={user} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
