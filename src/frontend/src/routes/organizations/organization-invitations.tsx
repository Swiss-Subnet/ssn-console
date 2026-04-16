import { LoadingButton } from '@/components/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import { Input } from '@/components/ui/input';
import type { InviteStatus, OrgInvite } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { Principal } from '@icp-sdk/core/principal';
import { z } from 'zod';

type InviteTargetKind = 'email' | 'userId' | 'principal';

const inviteSchema = z
  .object({
    kind: z.enum(['email', 'userId', 'principal']),
    value: z.string().trim().min(1, 'Value is required'),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'email' && !data.value.includes('@')) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Must be a valid email',
      });
    }
    if (data.kind === 'principal') {
      try {
        Principal.fromText(data.value);
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Must be a valid principal',
        });
      }
    }
  });

type InviteFormData = z.infer<typeof inviteSchema>;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRelativeExpiry(expiresAtNs: bigint): string {
  const diffMs = Number(expiresAtNs / 1_000_000n) - Date.now();
  if (diffMs <= 0) return 'Expired';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `In ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

function formatInviteTarget(invite: OrgInvite): string {
  switch (invite.target.kind) {
    case 'email':
      return invite.target.email;
    case 'userId':
      return invite.target.userId;
    case 'principal':
      return invite.target.principal.toString();
  }
}

function buildInviteTarget(kind: InviteTargetKind, value: string) {
  switch (kind) {
    case 'email':
      return { kind: 'email' as const, email: value };
    case 'userId':
      return { kind: 'userId' as const, userId: value };
    case 'principal':
      return {
        kind: 'principal' as const,
        principal: Principal.fromText(value),
      };
  }
}

interface OrganizationInvitationsProps {
  orgId: string;
}

export const OrganizationInvitations: FC<OrganizationInvitationsProps> = ({
  orgId,
}) => {
  const { listOrgInvites, createOrgInvite, revokeOrgInvite } = useAppStore();

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { kind: 'email', value: '' },
  });

  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InviteStatus | 'all'>(
    'pending',
  );

  const filteredInvites = useMemo(
    () =>
      statusFilter === 'all'
        ? invites
        : invites.filter(i => i.status === statusFilter),
    [invites, statusFilter],
  );

  const refreshInvites = useCallback(async () => {
    try {
      setInvites(await listOrgInvites(orgId));
    } catch (err) {
      showErrorToast('Failed to load invitations', err);
    }
  }, [orgId, listOrgInvites]);

  useEffect(() => {
    refreshInvites();
  }, [refreshInvites]);

  async function onInviteSubmit(data: InviteFormData): Promise<void> {
    try {
      await createOrgInvite({
        orgId,
        target: buildInviteTarget(data.kind, data.value),
      });
      showSuccessToast('Invitation created');
      inviteForm.reset({ kind: data.kind, value: '' });
      await refreshInvites();
    } catch (err) {
      showErrorToast('Failed to create invitation', err);
    }
  }

  async function onRevoke(inviteId: string): Promise<void> {
    setRevokingId(inviteId);
    try {
      await revokeOrgInvite(inviteId);
      showSuccessToast('Invitation revoked');
      await refreshInvites();
    } catch (err) {
      showErrorToast('Failed to revoke invitation', err);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Invite users by email, user ID, or principal. Invitations expire after
          7 days. Target existence is never disclosed.
        </p>

        <Form {...inviteForm}>
          <form
            className="space-y-4"
            onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
          >
            <FormField
              control={inviteForm.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target type</FormLabel>
                  <FormControl>
                    <select
                      className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                      value={field.value}
                      onChange={e =>
                        field.onChange(e.target.value as InviteTargetKind)
                      }
                    >
                      <option value="email">Email</option>
                      <option value="userId">User ID</option>
                      <option value="principal">Principal</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={inviteForm.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton
              type="submit"
              isLoading={inviteForm.formState.isSubmitting}
            >
              Send invitation
            </LoadingButton>
          </form>
        </Form>

        <Separator />

        <div className="flex flex-wrap gap-2">
          {(['pending', 'accepted', 'declined', 'revoked', 'all'] as const).map(
            s => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {capitalize(s)}
              </Button>
            ),
          )}
        </div>

        {filteredInvites.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No invitations in this filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="max-w-xs truncate">
                    {formatInviteTarget(inv)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={inv.status === 'pending' ? 'default' : 'outline'}
                    >
                      {capitalize(inv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {inv.status === 'pending'
                      ? formatRelativeExpiry(inv.expiresAtNs)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {inv.status === 'pending' && (
                      <LoadingButton
                        size="sm"
                        variant="ghost"
                        isLoading={revokingId === inv.id}
                        onClick={() => onRevoke(inv.id)}
                      >
                        Revoke
                      </LoadingButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
