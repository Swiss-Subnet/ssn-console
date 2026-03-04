import { ProjectSelector } from '@/components/layout/project-selector';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import type { FC } from 'react';

export const AppSidebar: FC = () => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ProjectSelector />
      </SidebarHeader>

      <SidebarContent>{/* [TODO]... */}</SidebarContent>

      <SidebarFooter>{/* [TODO]... */}</SidebarFooter>
    </Sidebar>
  );
};
