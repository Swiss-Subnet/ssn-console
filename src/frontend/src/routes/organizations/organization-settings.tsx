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
import { useAppStore, selectOrgMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { OrgTeam, OrgUser, Project } from '@/lib/api-models';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { z } from 'zod';
import { OrganizationTeams } from './organization-teams';
import { OrganizationMembers } from './organization-members';
import { OrganizationInvitations } from './organization-invitations';
import { OrganizationProjects } from './organization-projects';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

const OrganizationSettings: FC = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const {
    updateOrganization,
    deleteOrganization,
    loadOrgUsers,
    loadOrgTeams,
    loadOrgProjects,
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

  const [members, setMembers] = useState<OrgUser[]>([]);
  const [teams, setTeams] = useState<OrgTeam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const refreshProjects = useCallback(async () => {
    if (!orgId) return;
    try {
      setProjects(await loadOrgProjects(orgId));
    } catch (err) {
      showErrorToast('Failed to load projects', err);
    }
  }, [orgId, loadOrgProjects]);

  useEffect(() => {
    if (organization) {
      form.reset({ name: organization.name });
    }
  }, [organization, form]);

  useEffect(() => {
    refreshMembers();
    refreshTeams();
    refreshProjects();
  }, [refreshMembers, refreshTeams, refreshProjects]);

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
                        <Input
                          {...field}
                          disabled={!organization.yourPermissions.orgAdmin}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  isLoading={form.formState.isSubmitting}
                  disabled={
                    !form.formState.isDirty ||
                    !organization.yourPermissions.orgAdmin
                  }
                >
                  Save Changes
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <OrganizationTeams
          orgId={orgId}
          teams={teams}
          canManageTeams={organization.yourPermissions.teamManage}
        />

        <OrganizationProjects
          orgId={orgId}
          projects={projects}
          canCreateProject={organization.yourPermissions.projectCreate}
        />

        <OrganizationMembers members={members} />

        <OrganizationInvitations orgId={orgId} />

        {organization.yourPermissions.orgAdmin && (
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
        )}
      </div>
    </Container>
  );
};

export default OrganizationSettings;
