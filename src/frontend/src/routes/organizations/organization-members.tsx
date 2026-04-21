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
  canSeeDetails: boolean;
}

export const OrganizationMembers: FC<OrganizationMembersProps> = ({
  members,
  canSeeDetails,
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
                {canSeeDetails && <TableHead>Teams</TableHead>}
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      {m.email ?? (
                        <span className="text-muted-foreground">
                          (no email)
                        </span>
                      )}
                      {m.email && !m.emailVerified && (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                      {canSeeDetails && m.isOrgAdmin && <Badge>Admin</Badge>}
                    </span>
                  </TableCell>
                  {canSeeDetails && (
                    <TableCell>
                      {m.teams.length === 0 ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {m.teams.map(t => (
                            <Badge key={t.id} variant="secondary">
                              {t.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  )}
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
