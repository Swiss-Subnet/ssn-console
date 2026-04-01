import { LoadingButton } from '@/components/loading-button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, type FC } from 'react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export type EmailVerificationPromptProps = {
  className?: string;
};

export const EmailVerificationPrompt: FC<EmailVerificationPromptProps> = ({
  className,
}) => {
  const { profile, sendVerificationEmail } = useAppStore();
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] =
    useState(false);

  async function onSendVerificationEmailClicked(): Promise<void> {
    if (!profile || !profile.email || profile.emailVerified) return;

    setIsSendingVerificationEmail(true);

    try {
      await sendVerificationEmail(profile.email);

      showSuccessToast('Verification email sent', 'Check your inbox.');
    } catch (err) {
      showErrorToast('Failed to send verification email', err);
    } finally {
      setIsSendingVerificationEmail(false);
    }
  }

  return (
    <div className={className ?? 'p-3'}>
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Email Not Verified</AlertTitle>
        <AlertDescription>
          Your email <span className="font-medium">{profile?.email}</span> is
          not verified. Click the button to send a verification link to your
          inbox (check spam if you don't see it).
        </AlertDescription>

        <AlertAction>
          <LoadingButton
            size="sm"
            variant="default"
            onClick={() => onSendVerificationEmailClicked()}
            isLoading={isSendingVerificationEmail}
          >
            Verify
          </LoadingButton>
        </AlertAction>
      </Alert>
    </div>
  );
};

export default EmailVerificationPrompt;
