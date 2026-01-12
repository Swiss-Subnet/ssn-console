import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { ThemeProvider } from '@/components/theme-provider';
import { IDENTITY_PROVIDER } from '@/env';
import { Router } from '@/router';
import type { FC } from 'react';

export const App: FC = () => (
  <InternetIdentityProvider
    loginOptions={{ identityProvider: IDENTITY_PROVIDER }}
  >
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  </InternetIdentityProvider>
);
