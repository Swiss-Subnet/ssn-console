import { Container } from '@/components/layout/container';
import { Header } from '@/components/layout/header';
import { useBackendApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useEffect, type FC } from 'react';
import { Outlet } from 'react-router';

export const DefaultLayout: FC = () => {
  const { isAuthenticated, setUserProfile } = useAppStore();
  const backendApi = useBackendApi();

  useEffect(() => {
    if (isAuthenticated) {
      backendApi
        .getOrCreateMyUserProfile()
        .then(setUserProfile)
        .catch(console.error);
    }
  }, [isAuthenticated]);

  return (
    <main className="flex w-full flex-col">
      <Header />

      <Container>
        <Outlet />
      </Container>
    </main>
  );
};
