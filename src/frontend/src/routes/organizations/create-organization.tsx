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
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

const CreateOrganization: FC = () => {
  const { createOrganization } = useAppStore();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      const org = await createOrganization(formData.name);
      showSuccessToast('Organization created successfully!');
      navigate(`/organizations/${org.id}/settings`);
    } catch (err) {
      showErrorToast('Failed to create organization', err);
    }
  }

  return (
    <Container>
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>

                    <FormControl>
                      <Input placeholder="My Organization" {...field} />
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
                Create Organization
              </LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateOrganization;
