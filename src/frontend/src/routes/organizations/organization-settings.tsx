import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppStore, selectOrgMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type {
  InviteStatus,
  OrgInvite,
  OrgUser,
  Team,
} from '@/lib/api-models';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { Principal } from '@icp-sdk/core/principal';
import { z } from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

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

const OrganizationSettings: FC = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const {
    updateOrganization,
    deleteOrganization,
    loadOrgUsers,
    loadOrgTeams,
    listOrgInvites,
    createOrgInvite,
    revokeOrgInvite,
  } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);

  const organization = useMemo(
    () => (orgId ? orgMap.get(orgId) : undefined),
    [orgId, orgMap],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { kind: 'email', value: '' },
  });

  const [members, setMembers] = useState<OrgUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InviteStatus | 'all'>(
    'pending',
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInvites = useMemo(
    () =>
      statusFilter === 'all'
        ? invites
        : invites.filter(i => i.status === statusFilter),
    [invites, statusFilter],
  );

  const refreshMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      setMembers(await loadOrgUsers(orgId));
    } catch (err) {
      showErrorToast('Failed to load members', err);
    }
  }, [orgId, loadOrgUsers]);

  const refreshTeams = useCallback(async () => {
    if (!orgId) return;
    try {
      setTeams(await loadOrgTeams(orgId));
    } catch (err) {
      showErrorToast('Failed to load teams', err);
    }
  }, [orgId, loadOrgTeams]);

  const refreshInvites = useCallback(async () => {
    if (!orgId) return;
    try {
      setInvites(await listOrgInvites(orgId));
    } catch (err) {
      showErrorToast('Failed to load invitations', err);
    }
  }, [orgId, listOrgInvites]);

  useEffect(() => {
    if (organization) {
      form.reset({ name: organization.name });
    }
  }, [organization, form]);

  useEffect(() => {
    refreshMembers();
    refreshTeams();
    refreshInvites();
  }, [refreshMembers, refreshTeams, refreshInvites]);

  if (isNil(orgId) || isNil(organization)) {
    return (
      <Container>
        <p className="text-muted-foreground">Organization not found.</p>
      </Container>
    );
  }

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await updateOrganization(orgId!, formData.name);
      showSuccessToast('Organization updated successfully!');
    } catch (err) {
      showErrorToast('Failed to update organization', err);
    }
  }

  async function onInviteSubmit(data: InviteFormData): Promise<void> {
    try {
      await createOrgInvite({
        orgId: orgId!,
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

  async function onDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteOrganization(orgId!);
      showSuccessToast('Organization deleted successfully!');
      navigate('/');
    } catch (err) {
      showErrorToast('Failed to delete organization', err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Container>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/canisters' },
          { label: organization.name },
        ]}
      />

      <div className="mt-6 space-y-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                className="space-y-8"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>

                      <FormControl>
                        <Input {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  isLoading={form.formState.isSubmitting}
                  disabled={!form.formState.isDirty}
                >
                  Save Changes
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Manage the teams in this organization.
            </p>

            {teams.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">
                No teams yet.
              </p>
            ) : (
              <ul className="divide-y">
                {teams.map(t => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span>{t.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/organizations/${orgId}/teams/${t.id}/settings`,
                        )
                      }
                    >
                      Manage
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              onClick={() => navigate(`/organizations/${orgId}/teams`)}
            >
              <Users className="mr-1 size-3.5" />
              Manage Teams
            </Button>
          </CardContent>
        </Card>

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
                          <span className="text-muted-foreground">
                            (no email)
                          </span>
                        )}
                        {m.email && !m.emailVerified && (
                          <Badge variant="outline" className="ml-2">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Invite users by email, user ID, or principal. Invitations expire
              after 7 days. Target existence is never disclosed.
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
              {(
                ['pending', 'accepted', 'declined', 'revoked', 'all'] as const
              ).map(s => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                >
                  {capitalize(s)}
                </Button>
              ))}
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
                          variant={
                            inv.status === 'pending' ? 'default' : 'outline'
                          }
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

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              Delete this organization. All projects must be removed first.
            </p>

            <LoadingButton
              variant="destructive"
              isLoading={isDeleting}
              onClick={onDelete}
            >
              Delete Organization
            </LoadingButton>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

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

export default OrganizationSettings;
