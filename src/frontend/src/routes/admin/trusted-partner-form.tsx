import { LoadingButton } from '@/components/loading-button';
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
import { PrincipalTextSchema } from '@dfinity/zod-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

export type TrustedPartnerFormProps = {
  className?: string;
};

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  principal: PrincipalTextSchema,
});

type FormData = z.infer<typeof formSchema>;

export const TrustedPartnerForm: FC<TrustedPartnerFormProps> = ({
  className,
}) => {
  const { createTrustedPartner } = useAppStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', principal: '' },
  });

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await createTrustedPartner(formData);
      form.reset();
      showSuccessToast('Trusted partner added successfully!');
    } catch (err) {
      showErrorToast('Failed to create trusted partner', err);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Add Trusted Partner</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Partner Name</FormLabel>

                  <FormControl>
                    <Input placeholder="Trustworthy Partner AG" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="principal"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Partner Principal</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="esnbu-tvlmz-llrn2-clxkp-q6746-hx6o5-ln6li-om2lt-dzree-muoij-sqe"
                      {...field}
                    />
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
              Add Partner
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
