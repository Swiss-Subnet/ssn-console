import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { selectIsActive, useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import LoadingSpinner from '@/components/loading-spinner';

export const DefaultLayout: FC = () => {
  const { isProfileInitialized, isProfileLoading, isAuthenticated } =
    useAppStore();
  const isActive = useAppStore(selectIsActive);

  if (!isProfileInitialized || isProfileLoading) {
    return (
      <>
        <Toaster position="bottom-right" richColors />
        <LoadingSpinner className="mt-8" message="Initializing..." />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="flex flex-col">
        <Header />

        <div className="flex flex-1">
          {isAuthenticated && isActive ? (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <Outlet />
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </>
  );
};
