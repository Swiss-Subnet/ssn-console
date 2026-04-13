import { ThemeProvider } from '@/components/theme-provider';
import { Router } from '@/router';
import { useEffect, type FC } from 'react';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';

export const App: FC = () => {
  const { initializeAuth } = useAppStore();

  useEffect(() => {
    try {
      initializeAuth();
    } catch (err) {
      showErrorToast('Failed to initialize auth client', err);
    }
  }, [initializeAuth]);

  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
};
