import { H1 } from '@/components/typography/h1';
import { EmailPrompt } from './email-prompt';
import type { FC } from 'react';
import { useAppStore } from '@/lib/store';

const Home: FC = () => {
  const { isAuthenticated, userProfileApi, identity, profile } = useAppStore();
  return (
    <>
      <H1>Swiss Subnet Console</H1>
      {isAuthenticated && userProfileApi && (
        <>
          <EmailPrompt />
          <div className="mt-3">ID: {profile?.id}</div>
          <div>Principal: {identity?.getPrincipal().toText()}</div>
        </>
      )}
    </>
  );
};

export default Home;
