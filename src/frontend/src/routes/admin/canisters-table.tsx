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
import { AdminEmail } from '@/routes/admin/admin-email';
import { DownloadCanistersButton } from '@/routes/admin/download-canisters-button';
import { BadgeCheckIcon } from 'lucide-react';
import { type FC } from 'react';

export type CanistersTableProps = {
  className?: string;
};

export const CanistersTable: FC<CanistersTableProps> = ({ className }) => {
  const adminCanisters = useAppStore(s => s.adminCanisters);
  const untrackedCount = useAppStore(s => s.adminUntrackedCount);
  const isLoading = useAppStore(s => s.isAdminCanistersLoading);

  if (isLoading && adminCanisters === null) {
    return (
      <p className="text-muted-foreground text-sm">Loading canisters...</p>
    );
  }

  if (adminCanisters !== null && adminCanisters.length === 0) {
    return <p className="text-muted-foreground text-sm">No canisters found.</p>;
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {adminCanisters?.length ?? 0} canisters on the subnet,{' '}
          {untrackedCount} not registered in the console.
        </p>
        <DownloadCanistersButton canisters={adminCanisters ?? []} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canister</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="w-1">Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {adminCanisters?.map(c => (
            <TableRow key={c.principal}>
              <TableCell>
                <span className="font-mono text-xs">{c.principal}</span>
              </TableCell>

              <TableCell>
                {c.tracked ? (
                  <span className="inline-flex items-center gap-1">
                    <AdminEmail email={c.email} />
                    {c.email && c.emailVerified && (
                      <BadgeCheckIcon
                        className="text-primary size-4 shrink-0"
                        aria-label="Email verified"
                      />
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">--</span>
                )}
              </TableCell>

              <TableCell>
                <Badge variant={c.tracked ? 'secondary' : 'outline'}>
                  {c.tracked ? 'Tracked' : 'Untracked'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
