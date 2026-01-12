import { ThemeProvider } from '@/components/theme-provider';
import { Router } from '@/router';
import { useEffect, type FC } from 'react';
import { useAppStore } from '@/lib/store';

export const App: FC = () => {
  const { initializeAuth, initializeApi } = useAppStore();

  useEffect(() => {
    initializeAuth();
    initializeApi();
  }, [initializeAuth]);

  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
};
