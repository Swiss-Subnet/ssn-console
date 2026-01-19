import { ThemeProvider } from '@/components/theme-provider';
import { Router } from '@/router';
import { useEffect, type FC } from 'react';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';

export const App: FC = () => {
  const { initializeAuth, initializeApi } = useAppStore();

  useEffect(() => {
    try {
      initializeApi();
    } catch (err) {
      showErrorToast('Failed to initialize API', err);
    }

    try {
      initializeAuth();
    } catch (err) {
      showErrorToast('Failed to initialize auth client', err);
    }
  }, [initializeApi, initializeAuth]);

  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
};
