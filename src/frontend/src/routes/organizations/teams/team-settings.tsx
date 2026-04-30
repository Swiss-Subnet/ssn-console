import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
  PermissionsEditor,
  orgPermissionFields,
} from '@/components/permissions-editor';
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
import { useAppStore, selectOrgMap, selectTeamMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { OrgTeam, OrgUser, TeamUser } from '@/lib/api-models';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { z } from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Team name is required')
    .max(100, 'Team name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

const TeamSettings: FC = () => {
  const { orgId, teamId } = useParams();
  const navigate = useNavigate();
  const {
    updateTeam,
    deleteTeam,
    loadOrgUsers,
    loadOrgTeams,
    loadTeamUsers,
    addUserToTeam,
    updateTeamOrgPermissions,
  } = useAppStore();
  const teamMap = useAppStore(selectTeamMap);
  const orgMap = useAppStore(selectOrgMap);

  const team = useMemo(
    () => (teamId ? teamMap.get(teamId) : undefined),
    [teamId, teamMap],
  );

  const organization = useMemo(
    () => (orgId ? orgMap.get(orgId) : undefined),
    [orgId, orgMap],
  );

  const canTeamManage = organization?.yourPermissions.teamManage ?? false;
  const canMemberManage = organization?.yourPermissions.memberManage ?? false;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const [orgMembers, setOrgMembers] = useState<OrgUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamUser[]>([]);
  const [orgTeam, setOrgTeam] = useState<OrgTeam | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshOrgMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      setOrgMembers(await loadOrgUsers(orgId));
    } catch (err) {
      showErrorToast('Failed to load org members', err);
    }
  }, [orgId, loadOrgUsers]);

  const refreshTeamMembers = useCallback(async () => {
    if (!teamId) return;
    try {
      setTeamMembers(await loadTeamUsers(teamId));
    } catch (err) {
      showErrorToast('Failed to load team members', err);
    }
  }, [teamId, loadTeamUsers]);

  const refreshOrgTeam = useCallback(async () => {
    if (!orgId || !teamId) return;
    try {
      const teams = await loadOrgTeams(orgId);
      setOrgTeam(teams.find(t => t.id === teamId) ?? null);
    } catch (err) {
      showErrorToast('Failed to load team permissions', err);
    }
  }, [orgId, teamId, loadOrgTeams]);

  const teamMemberIds = useMemo(
    () => new Set(teamMembers.map(m => m.id)),
    [teamMembers],
  );
  const addableOrgMembers = useMemo(
    () => orgMembers.filter(m => !teamMemberIds.has(m.id)),
    [orgMembers, teamMemberIds],
  );

  useEffect(() => {
    if (team) {
      form.reset({ name: team.name });
    }
  }, [team, form]);

  useEffect(() => {
    refreshOrgMembers();
    refreshTeamMembers();
    refreshOrgTeam();
  }, [refreshOrgMembers, refreshTeamMembers, refreshOrgTeam]);

  if (isNil(orgId) || isNil(teamId) || isNil(team)) {
    return (
      <Container>
        <p className="text-muted-foreground">Team not found.</p>
      </Container>
    );
  }

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await updateTeam(teamId!, formData.name);
      showSuccessToast('Team updated successfully!');
    } catch (err) {
      showErrorToast('Failed to update team', err);
    }
  }

  async function onAddMember(): Promise<void> {
    if (!selectedUserId) return;
    setIsAdding(true);
    try {
      await addUserToTeam(teamId!, selectedUserId);
      showSuccessToast('Member added to team');
      setSelectedUserId('');
      await refreshTeamMembers();
    } catch (err) {
      showErrorToast('Failed to add member', err);
    } finally {
      setIsAdding(false);
    }
  }

  async function onSavePermissions(
    permissions: OrgTeam['permissions'],
  ): Promise<void> {
    const updated = await updateTeamOrgPermissions(teamId!, permissions);
    setOrgTeam(updated);
    showSuccessToast('Permissions updated');
  }

  async function onDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteTeam(teamId!);
      showSuccessToast('Team deleted successfully!');
      navigate(`/organizations/${orgId}/settings`);
    } catch (err) {
      showErrorToast('Failed to delete team', err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Container>
      <Breadcrumbs
        items={[
          {
            label: organization?.name ?? 'Organization',
            to: `/organizations/${orgId}/settings`,
          },
          { label: 'Teams', to: `/organizations/${orgId}/teams` },
          { label: team.name },
        ]}
      />

      <div className="mt-6 space-y-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Team Settings</CardTitle>
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
                      <FormLabel>Team Name</FormLabel>

                      <FormControl>
                        <Input {...field} disabled={!canTeamManage} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  className="w-full"
                  isLoading={form.formState.isSubmitting}
                  disabled={!form.formState.isDirty || !canTeamManage}
                >
                  Save Changes
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        {orgTeam && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Organization Permissions</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                Permissions this team grants on the organization.
              </p>

              <PermissionsEditor
                value={orgTeam.permissions}
                fields={orgPermissionFields}
                disabled={!canTeamManage}
                errorToastTitle="Failed to update permissions"
                onSave={onSavePermissions}
              />
            </CardContent>
          </Card>
        )}

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {teamMembers.length === 0 ? (
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
                  {teamMembers.map(m => (
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

            {canMemberManage && (
              <>
                <Separator />

                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Add an existing organization member to this team.
                  </p>

                  {addableOrgMembers.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      All organization members are already on this team.
                    </p>
                  ) : (
                    <>
                      <select
                        className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                        value={selectedUserId}
                        onChange={e => setSelectedUserId(e.target.value)}
                      >
                        <option value="">Select a member...</option>
                        {addableOrgMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.email ?? m.id}
                          </option>
                        ))}
                      </select>

                      <LoadingButton
                        isLoading={isAdding}
                        disabled={!selectedUserId}
                        onClick={onAddMember}
                      >
                        Add to Team
                      </LoadingButton>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {canTeamManage && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                Delete this team. All projects must be removed first.
              </p>

              <LoadingButton
                variant="destructive"
                isLoading={isDeleting}
                onClick={onDelete}
              >
                Delete Team
              </LoadingButton>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
};

export default TeamSettings;
