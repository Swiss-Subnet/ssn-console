import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/layout/container';
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
import { useAppStore, selectOrgMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { z } from 'zod';

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
  const { updateOrganization, deleteOrganization } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);

  const organization = useMemo(
    () => (orgId ? orgMap.get(orgId) : undefined),
    [orgId, orgMap],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (organization) {
      form.reset({ name: organization.name });
    }
  }, [organization, form]);

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

  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="space-y-6">
        <div className="mx-auto max-w-md">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 size-3.5" />
            Back
          </Button>
        </div>

        <Card className="mx-auto max-w-md">
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

export default OrganizationSettings;
