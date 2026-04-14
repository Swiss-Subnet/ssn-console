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
import { useAppStore, selectOrgMap, selectTeamMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FC } from 'react';
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
  const { updateTeam, deleteTeam } = useAppStore();
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (team) {
      form.reset({ name: team.name });
    }
  }, [team, form]);

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

  const [isDeleting, setIsDeleting] = useState(false);

  async function onDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteTeam(teamId!);
      showSuccessToast('Team deleted successfully!');
      navigate(`/organizations/${orgId}/teams`);
    } catch (err) {
      showErrorToast('Failed to delete team', err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <Breadcrumbs
          className="mx-auto max-w-md"
          items={[
            { label: 'Home', to: '/canisters' },
            {
              label: organization?.name ?? 'Organization',
              to: `/organizations/${orgId}/settings`,
            },
            { label: 'Teams', to: `/organizations/${orgId}/teams` },
            { label: team.name },
          ]}
        />

        <Card className="mx-auto max-w-md">
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
                        <Input {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  className="w-full"
                  isLoading={form.formState.isSubmitting}
                  disabled={!form.formState.isDirty}
                >
                  Save Changes
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mx-auto max-w-md">
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
      </div>
    </Container>
  );
};

export default TeamSettings;
