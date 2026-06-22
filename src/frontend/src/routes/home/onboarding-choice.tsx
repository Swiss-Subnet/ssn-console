import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useState, type FC } from 'react';
import AccountRecoveryPrompt from './account-recovery-prompt';

export type OnboardingChoiceProps = {
  className?: string;
};

// Shown to a signed-in principal that has no profile yet. We no longer
// auto-create one on login, so the user decides: start a fresh account, or
// recover an existing one onto this Internet Identity via email.
export const OnboardingChoice: FC<OnboardingChoiceProps> = ({ className }) => {
  const { createProfile } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);

  async function onCreateClicked(): Promise<void> {
    setIsCreating(true);
    try {
      await createProfile();
    } catch (err) {
      showErrorToast('Failed to create account', err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className={cn('mx-auto max-w-md space-y-4', className)}>
      <Card>
        <CardContent className="space-y-3 text-center">
          <CardTitle>Welcome</CardTitle>
          <p className="text-muted-foreground text-sm">
            This Internet Identity isn't linked to an account yet.
          </p>
          <LoadingButton
            size="lg"
            className="w-full"
            isLoading={isCreating}
            onClick={() => onCreateClicked()}
          >
            Create a new account
          </LoadingButton>
        </CardContent>
      </Card>

      <AccountRecoveryPrompt />
    </div>
  );
};

export default OnboardingChoice;
