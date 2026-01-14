import { H1 } from '@/components/typography/h1';
import { EmailPrompt } from '@/components/features/email-prompt';
import type { FC } from 'react';
import { useAppStore } from '@/lib/store';

const Home: FC = () => {
  const { isAuthenticated, userProfileApi } = useAppStore();
  return (
    <>
      <H1>Swiss Subnet Console</H1>
      {isAuthenticated && userProfileApi && <EmailPrompt />}
    </>
  );
};

export default Home;
