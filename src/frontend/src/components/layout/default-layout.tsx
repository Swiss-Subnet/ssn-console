import { Header } from '@/components/layout/header';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import LoadingSpinner from '@/components/loading-spinner';

export const DefaultLayout: FC = () => {
  const { isProfileInitialized, isProfileLoading } = useAppStore();

  return (
    <>
      <Toaster position="bottom-right" richColors />

      {!isProfileInitialized || isProfileLoading ? (
        <LoadingSpinner className="mt-8" message="Initializing..." />
      ) : (
        <div className="flex flex-col">
          <Header />

          <div className="flex flex-1">
            <Outlet />
          </div>
        </div>
      )}
    </>
  );
};
