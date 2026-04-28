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
} from '@/components/form';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRequireProjectId } from '@/lib/params';
import { BACKEND_CANISTER_ID } from '@/env';

export type LinkCanisterFormProps = {
  className?: string;
  onLinked?: () => void;
};

const formSchema = z.object({
  principal: PrincipalTextSchema,
  name: z.string().trim().max(64).optional(),
});

type FormData = z.infer<typeof formSchema>;

export const LinkCanisterForm: FC<LinkCanisterFormProps> = ({
  className,
  onLinked,
}) => {
  const { linkCanister, identity } = useAppStore();
  const projectId = useRequireProjectId();
  const callerPrincipal = identity?.getPrincipal().toText() ?? '';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { principal: '', name: '' },
  });

  async function onSubmit(formData: FormData): Promise<void> {
    const trimmedName = formData.name?.trim();
    try {
      await linkCanister(
        projectId,
        formData.principal,
        trimmedName ? trimmedName : null,
      );
      form.reset();
      showSuccessToast('Canister linked successfully!');
      onLinked?.();
    } catch (err) {
      showErrorToast('Failed to link canister', err);
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="bg-muted/30 rounded-md border p-4 text-sm">
        <p className="font-medium">Before linking, set up the canister:</p>
        <ol className="text-muted-foreground mt-2 ml-5 list-decimal space-y-1">
          <li>
            Add the SSN backend canister as a controller:
            <code className="bg-background ml-1 rounded px-1 py-0.5 text-xs break-all">
              {BACKEND_CANISTER_ID}
            </code>
          </li>
          <li>
            Your principal must also be a controller:
            <code className="bg-background ml-1 rounded px-1 py-0.5 text-xs break-all">
              {callerPrincipal || '(not signed in)'}
            </code>
          </li>
        </ol>
        <p className="text-muted-foreground mt-2">
          Use{' '}
          <code className="bg-background rounded px-1 py-0.5 text-xs">
            dfx canister update-settings &lt;canister&gt; --add-controller
            &lt;principal&gt;
          </code>{' '}
          to add controllers.
        </p>
      </div>

      <Form {...form}>
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="principal"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Canister Principal</FormLabel>
                <FormControl>
                  <Input placeholder="rrkah-fqaaa-aaaaa-aaaaq-cai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Display Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="My Backend" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <LoadingButton
            type="submit"
            variant="default"
            isLoading={form.formState.isSubmitting}
            className="self-start"
          >
            Link Canister
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
};
