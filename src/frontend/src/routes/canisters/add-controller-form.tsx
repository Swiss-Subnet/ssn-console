import { LoadingButton } from '@/components/loading-button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { type FC } from 'react';
import z from 'zod';
import { PrincipalTextSchema } from '@dfinity/zod-schemas';
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

export type AddControllerFormProps = {
  canisterId: string;
  className?: string;
};

const formSchema = z.object({
  principal: PrincipalTextSchema,
});

type FormData = z.infer<typeof formSchema>;

export const AddControllerForm: FC<AddControllerFormProps> = ({
  canisterId,
  className,
}) => {
  const { addController } = useAppStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { principal: '' },
  });

  async function onSubmit(formData: FormData): Promise<void> {
    await addController(canisterId, formData.principal);
    form.reset();
  }

  return (
    <Form {...form}>
      <form
        className={cn('flex w-full items-end gap-2', className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="principal"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Controller Principal</FormLabel>

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
          Add Controller
        </LoadingButton>
      </form>
    </Form>
  );
};
