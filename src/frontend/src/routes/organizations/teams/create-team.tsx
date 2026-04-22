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
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { selectOrgMap } from '@/lib/store';
import { z } from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Team name is required')
    .max(100, 'Team name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

const CreateTeam: FC = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { createTeam } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);
  const organization = orgId ? orgMap.get(orgId) : undefined;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  if (isNil(orgId) || isNil(organization)) {
    return (
      <Container>
        <p className="text-muted-foreground">Organization not found.</p>
      </Container>
    );
  }

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      const team = await createTeam(orgId!, formData.name);
      showSuccessToast('Team created successfully!');
      navigate(`/organizations/${orgId}/teams/${team.id}/settings`);
    } catch (err) {
      showErrorToast('Failed to create team', err);
    }
  }

  return (
    <Container>
      <Breadcrumbs
        items={[
          {
            label: organization.name,
            to: `/organizations/${orgId}/settings`,
          },
          { label: 'Teams', to: `/organizations/${orgId}/teams` },
          { label: 'New Team' },
        ]}
      />

      <Card className="mx-auto mt-6 max-w-md">
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>

                    <FormControl>
                      <Input placeholder="My Team" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton
                type="submit"
                className="w-full"
                isLoading={form.formState.isSubmitting}
              >
                Create Team
              </LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateTeam;
