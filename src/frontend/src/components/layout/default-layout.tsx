import { Container } from '@/components/layout/container';
import { Header } from '@/components/layout/header';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';

export const DefaultLayout: FC = () => {
  const { isProfileInitialized, isProfileLoading } = useAppStore();

  return (
    <>
      <Toaster position="bottom-right" richColors />

      {!isProfileInitialized || isProfileLoading ? (
        <div
          className="mt-8 flex flex-col items-center justify-center gap-4"
          role="status"
          aria-live="polite"
        >
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      ) : (
        <main className="flex w-full flex-col">
          <Header />

          <Container>
            <Outlet />
          </Container>
        </main>
      )}
    </>
  );
};
