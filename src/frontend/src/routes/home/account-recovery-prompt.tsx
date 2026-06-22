import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useState, type FC, type FormEvent } from 'react';

export type AccountRecoveryPromptProps = {
  className?: string;
};

export const AccountRecoveryPrompt: FC<AccountRecoveryPromptProps> = ({
  className,
}) => {
  const { sendRecoveryEmail } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    try {
      await sendRecoveryEmail(email);
      // Always succeeds from the client's view: the endpoint never reveals
      // whether the email maps to an account.
      showSuccessToast(
        'Recovery email sent',
        'If an account uses this email, a recovery link is on its way (check spam).',
      );
      setEmail('');
      setIsOpen(false);
    } catch (err) {
      showErrorToast('Failed to send recovery email', err);
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <div className={cn('text-center', className)}>
        <Button variant="link" size="sm" onClick={() => setIsOpen(true)}>
          Lost access to your Internet Identity?
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn('mx-auto max-w-md', className)}>
      <CardContent>
        <p className="text-muted-foreground mb-3 text-sm">
          Enter the verified email on your account. We'll send a link to relink
          a new Internet Identity.
        </p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSending}
            required
          />
          <LoadingButton type="submit" isLoading={isSending} disabled={!email}>
            Send link
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountRecoveryPrompt;
