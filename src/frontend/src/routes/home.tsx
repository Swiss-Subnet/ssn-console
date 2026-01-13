import { H1 } from '@/components/typography/h1';
import { EmailPrompt } from '@/components/features/email-prompt';
import { Toaster } from 'sonner';
import type { FC } from 'react';

const Home: FC = () => (
  <>
    <Toaster position="top-right" richColors />
    <H1>Swiss Subnet Console</H1>
    <EmailPrompt />
  </>
);

export default Home;
