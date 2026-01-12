import { ThemeProvider } from '@/components/theme-provider';
import { Router } from '@/router';
import { useEffect, type FC } from 'react';
import { BackendApiProvider } from '@/lib/api';
import { AgentProvider } from '@/lib/agent';
import { useAppStore } from '@/lib/store';

export const App: FC = () => {
  const { initializeAuth } = useAppStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ThemeProvider>
      <AgentProvider>
        <BackendApiProvider>
          <Router />
        </BackendApiProvider>
      </AgentProvider>
    </ThemeProvider>
  );
};
