import { LoadingButton } from '@/components/loading-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { useState, type FC } from 'react';
import { CheckCircleIcon } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

export const EmailPrompt: FC = () => {
  const { profile, setEmail: setEmailInStore } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  // Show registered email if already set
if (profile?.email && !isEditing) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
            <CheckCircleIcon className="size-5" />
            <CardTitle>Email Registered</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You're signed up with:{' '}
            <span className="text-foreground font-medium">{profile.email}</span>
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              form.setValue('email', profile.email ?? '');
              setIsEditing(true);
            }}
            className="mt-2 p-0"
          >
            Edit
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show form if no email set
  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await setEmailInStore(formData.email);
      showSuccessToast('Email registered successfully!');
      setIsEditing(false);
      form.reset();
    } catch (error) {
      showErrorToast('Failed to register email', error);
    }
  }

  return (
    <Card className="mx-auto mt-8 max-w-md">
      <CardHeader>
        <CardTitle>Welcome! 👋</CardTitle>
        <CardDescription>
          Please register your email to receive updates and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>

                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
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
              Register Email
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
