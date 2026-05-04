import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { TermsAndConditionsContent } from '@/routes/admin/terms-and-conditions-content';

export type TermsAndConditionsFormProps = {
  className?: string;
};

const formSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  comment: z.string().min(1, 'Comment is required'),
});

type FormData = z.infer<typeof formSchema>;

export const TermsAndConditionsForm: FC<TermsAndConditionsFormProps> = ({
  className,
}) => {
  const { createTermsAndConditions } = useAppStore();

  const [isPreviewing, setIsPreviewing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
      comment: '',
    },
  });

  const previewContent = form.watch('content');

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await createTermsAndConditions(formData);
      form.reset();
      setIsPreviewing(false);
      showSuccessToast('Terms and conditions created successfully!');
    } catch (err) {
      showErrorToast('Failed to create terms and conditions', err);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Create Terms and Conditions</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a comment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center justify-between">
                    <FormLabel>Content</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPreviewing(p => !p)}
                      disabled={!previewContent}
                    >
                      {isPreviewing ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                  <FormControl>
                    {isPreviewing ? (
                      <TermsAndConditionsContent
                        value={previewContent}
                        raw
                        className="border-input min-h-32 rounded-md border p-3"
                      />
                    ) : (
                      <Textarea
                        placeholder="Enter terms and conditions content (markdown)"
                        className="min-h-64"
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              variant="outline"
              isLoading={form.formState.isSubmitting}
            >
              Create Terms & Conditions
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
