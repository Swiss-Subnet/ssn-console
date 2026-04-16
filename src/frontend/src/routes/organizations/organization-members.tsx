import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OrgUser } from '@/lib/api-models';
import type { FC } from 'react';

interface OrganizationMembersProps {
  members: OrgUser[];
}

export const OrganizationMembers: FC<OrganizationMembersProps> = ({
  members,
}) => {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.email ?? (
                      <span className="text-muted-foreground">(no email)</span>
                    )}
                    {m.email && !m.emailVerified && (
                      <Badge variant="outline" className="ml-2">
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
