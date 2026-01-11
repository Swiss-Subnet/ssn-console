import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { ThemeProvider } from '@/components/theme-provider';
import { IDENTITY_PROVIDER } from '@/env';
import { Router } from '@/router';
import type { FC } from 'react';
import { BackendApiProvider } from '@/lib/api';
import { AppStateProvider } from '@/lib/state';
import { AgentProvider } from '@/lib/agent';

export const App: FC = () => (
  <InternetIdentityProvider
    loginOptions={{ identityProvider: IDENTITY_PROVIDER }}
  >
    <ThemeProvider>
      <AgentProvider>
        <BackendApiProvider>
          <AppStateProvider>
            <Router />
          </AppStateProvider>
        </BackendApiProvider>
      </AgentProvider>
    </ThemeProvider>
  </InternetIdentityProvider>
);
