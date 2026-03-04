import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { FC } from 'react';
import { Outlet } from 'react-router';

export const ProjectLayout: FC = () => {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <div className="p-3">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
