import { H1 } from '@/components/typography/h1';
import { EmailPrompt } from './email-prompt';
import type { FC } from 'react';
import { selectIsActive, useAppStore } from '@/lib/store';
import { SignUpPrompt } from '@/routes/home/sign-up-prompt';
import { ActivityPrompt } from '@/routes/home/activity-prompt';

const Home: FC = () => {
  const { isAuthenticated } = useAppStore();
  const isActive = useAppStore(selectIsActive);

  return (
    <>
      <div className="text-center">
        {isActive ? <H1>Console</H1> : <H1>Console Access Request</H1>}

        <p className="text-muted-foreground mt-2">
          Secure orchestration for Swiss-domiciled canisters
        </p>
      </div>

      {!isAuthenticated && <SignUpPrompt className="mt-8" />}

      {isAuthenticated && !isActive && <EmailPrompt className="mt-8" />}

      {isAuthenticated && isActive && <ActivityPrompt className="mt-8" />}
    </>
  );
};

export default Home;
