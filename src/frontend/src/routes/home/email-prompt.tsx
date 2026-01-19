import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { useState, type FC } from 'react';
import { CheckCircleIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { PromptHeader } from '@/routes/home/prompt-header';
import { PromptFooter } from '@/routes/home/prompt-footer';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export type EmailPromptProps = {
  className?: string;
};

const formSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

export const EmailPrompt: FC<EmailPromptProps> = ({ className }) => {
  const { profile, setEmail } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  function onEditEmailClicked(): void {
    try {
      form.setValue('email', profile?.email || '');
      setIsEditing(true);
      showSuccessToast('Email registered successfully!');
    } catch (err) {
      showErrorToast('Failed to update email', err);
    }
  }

  if (profile?.email && !isEditing) {
    return (
      <Card className={cn('mx-auto max-w-md', className)}>
        <PromptHeader />

        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4 py-2 text-center">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <CheckCircleIcon className="size-8 text-green-600 dark:text-green-500" />
            </div>

            <div className="space-y-1">
              <CardTitle>Email Registered</CardTitle>
              <p className="text-muted-foreground text-sm">
                You're on the list! We'll be in touch soon.
              </p>
            </div>

            <div className="bg-muted w-full rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">Signed up as: </span>
              <span className="text-foreground font-medium">
                {profile.email}
              </span>
            </div>

            <Button
              variant="link"
              size="sm"
              onClick={() => onEditEmailClicked()}
            >
              Use a different email
            </Button>
          </div>
        </CardContent>

        <PromptFooter />
      </Card>
    );
  }

  async function onSubmit(formData: FormData): Promise<void> {
    await setEmail(formData.email);
    setIsEditing(false);
    form.reset();
  }

  return (
    <Card className={cn('mx-auto max-w-md', className)}>
      <PromptHeader />

      <CardContent>
        <div className="mb-6 space-y-4">
          <p className="text-muted-foreground text-center">
            Enter your email to register with the waitlist:
          </p>

          <div className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            <p className="text-foreground font-medium">
              We'll use your email at most 3 times:
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>To confirm your sign-up for the closed beta.</li>
              <li>To let you know when you're accepted.</li>
              <li>
                Once we launch, to ask if you're interested in more updates.
              </li>
            </ol>
          </div>
        </div>

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

      <PromptFooter />
    </Card>
  );
};
