import { H1 } from '@/components/typography/h1';
import { EmailPrompt } from './email-prompt';
import type { FC } from 'react';
import { selectIsActive, useAppStore } from '@/lib/store';
import { SignUpPrompt } from '@/routes/home/sign-up-prompt';
import { ActivityPrompt } from '@/routes/home/activity-prompt';
import { Container } from '@/components/layout/container';
import EmailVerificationPrompt from './email-verification-prompt';
import AccountRecoveryPrompt from './account-recovery-prompt';
import OnboardingChoice from './onboarding-choice';

const Home: FC = () => {
  const { isAuthenticated, profile } = useAppStore();
  const isActive = useAppStore(selectIsActive);
  const hasProfile = isAuthenticated && profile !== null;

  return (
    <Container>
      <div className="text-center">
        {isActive ? <H1>Console</H1> : <H1>Console Access Request</H1>}

        <p className="text-muted-foreground mt-2">
          Secure orchestration for Swiss-domiciled canisters
        </p>
      </div>

      {!isAuthenticated && <SignUpPrompt className="mt-8" />}

      {!isAuthenticated && <AccountRecoveryPrompt className="mt-4" />}

      {isAuthenticated && !hasProfile && <OnboardingChoice className="mt-8" />}

      {hasProfile && profile?.email && !profile.emailVerified && (
        <EmailVerificationPrompt className="mt-8" />
      )}

      {hasProfile && !isActive && <EmailPrompt className="mt-8" />}

      {hasProfile && isActive && <ActivityPrompt className="mt-8" />}
    </Container>
  );
};

export default Home;
