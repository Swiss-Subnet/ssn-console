import { LoadingButton } from '@/components/loading-button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

export type StaffFormProps = {
  className?: string;
};

const formSchema = z
  .object({
    userId: z.string().min(1, 'User ID is required'),
    readAllOrgs: z.boolean(),
    writeBilling: z.boolean(),
  })
  .refine(data => data.readAllOrgs || data.writeBilling, {
    message: 'Select at least one permission',
    path: ['readAllOrgs'],
  });

type FormData = z.infer<typeof formSchema>;

type Pending = {
  userId: string;
  readAllOrgs: boolean;
  writeBilling: boolean;
};

export const StaffForm: FC<StaffFormProps> = ({ className }) => {
  const { grantStaffPermissions } = useAppStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { userId: '', readAllOrgs: false, writeBilling: false },
  });

  function onSubmit(formData: FormData): void {
    setPending({
      userId: formData.userId,
      readAllOrgs: formData.readAllOrgs,
      writeBilling: formData.writeBilling,
    });
    setConfirmInput('');
  }

  async function onConfirm(): Promise<void> {
    if (pending === null) return;
    setIsConfirming(true);
    try {
      await grantStaffPermissions(pending.userId, {
        readAllOrgs: pending.readAllOrgs,
        writeBilling: pending.writeBilling,
      });
      form.reset();
      setPending(null);
      setConfirmInput('');
      showSuccessToast('Staff permissions granted');
    } catch (err) {
      showErrorToast('Failed to grant staff permissions', err);
    } finally {
      setIsConfirming(false);
    }
  }

  function onCancel(): void {
    setPending(null);
    setConfirmInput('');
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Grant or Update Staff Permissions</CardTitle>
      </CardHeader>

      <CardContent>
        {pending === null ? (
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>User ID</FormLabel>

                    <FormControl>
                      <Input
                        placeholder="00000000-0000-0000-0000-000000000000"
                        {...field}
                      />
                    </FormControl>

                    <FormDescription>
                      Granting replaces the user&apos;s existing staff
                      permissions.
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="readAllOrgs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={field.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange(!field.value)}
                      >
                        Read all orgs
                      </Button>

                      <Button
                        type="button"
                        variant={
                          form.watch('writeBilling') ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          form.setValue(
                            'writeBilling',
                            !form.watch('writeBilling'),
                            {
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        Write billing
                      </Button>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" variant="outline">
                Review &amp; Grant
              </Button>
            </form>
          </Form>
        ) : (
          <ConfirmPanel
            pending={pending}
            confirmInput={confirmInput}
            onConfirmInputChange={setConfirmInput}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isConfirming={isConfirming}
          />
        )}
      </CardContent>
    </Card>
  );
};

type ConfirmPanelProps = {
  pending: Pending;
  confirmInput: string;
  onConfirmInputChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
};

const ConfirmPanel: FC<ConfirmPanelProps> = ({
  pending,
  confirmInput,
  onConfirmInputChange,
  onConfirm,
  onCancel,
  isConfirming,
}) => {
  const { users } = useAppStore();
  const matches = confirmInput.trim() === pending.userId.trim();
  const targetUser =
    users?.find(user => user.id === pending.userId.trim()) ?? null;

  return (
    <div className="space-y-4">
      <div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-md border p-4">
        <p className="text-foreground text-sm font-medium">
          You are about to grant staff permissions.
        </p>

        <dl className="space-y-2 text-xs/relaxed">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">User</dt>
            <dd className="space-y-0.5">
              {targetUser ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {targetUser.email ?? 'No email on file'}
                    </span>
                    {targetUser.email && (
                      <Badge
                        variant={
                          targetUser.emailVerified ? 'success' : 'secondary'
                        }
                      >
                        {targetUser.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground font-mono break-all">
                    {pending.userId}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-destructive font-medium">
                    Unknown user &mdash; no profile matches this ID.
                  </div>
                  <div className="text-muted-foreground font-mono break-all">
                    {pending.userId}
                  </div>
                </>
              )}
            </dd>
          </div>

          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Permissions</dt>
            <dd className="space-y-1">
              {pending.readAllOrgs && (
                <div>
                  <span className="font-medium">Read all orgs</span>
                  <span className="text-muted-foreground">
                    {' '}
                    &mdash; can read every organization, project and canister
                    regardless of membership.
                  </span>
                </div>
              )}
              {pending.writeBilling && (
                <div>
                  <span className="font-medium">Write billing</span>
                  <span className="text-muted-foreground">
                    {' '}
                    &mdash; can modify any organization&apos;s billing plan
                    (tier, limits, external reference).
                  </span>
                </div>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="staff-grant-confirm"
          className="text-foreground text-xs/relaxed font-medium"
        >
          Type the user ID to confirm
        </label>
        <Input
          id="staff-grant-confirm"
          autoFocus
          value={confirmInput}
          onChange={e => onConfirmInputChange(e.target.value)}
          placeholder={pending.userId}
        />
      </div>

      <div className="flex gap-2">
        <LoadingButton
          type="button"
          variant="destructive"
          disabled={!matches}
          isLoading={isConfirming}
          onClick={onConfirm}
        >
          Confirm grant
        </LoadingButton>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isConfirming}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
