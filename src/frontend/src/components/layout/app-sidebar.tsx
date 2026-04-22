import { ProjectSelector } from '@/components/layout/project-selector';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { isNil } from '@/lib/nil';
import { selectProjectMap, useAppStore } from '@/lib/store';
import {
  CreditCardIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from 'lucide-react';
import { useMemo, type FC } from 'react';
import { NavLink, useParams } from 'react-router';

const staticNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/billing', label: 'Billing', icon: CreditCardIcon },
];

export const AppSidebar: FC = () => {
  const { projectId: projectIdParam } = useParams();
  const projectMap = useAppStore(selectProjectMap);
  const projects = useAppStore(s => s.projects);

  const activeProjectId = projectIdParam ?? projects[0]?.id;

  const activeOrgId = useMemo(() => {
    if (isNil(activeProjectId)) return null;
    return projectMap.get(activeProjectId)?.orgId ?? null;
  }, [activeProjectId, projectMap]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ProjectSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {staticNavItems.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    tooltip={label}
                    render={<NavLink to={to} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {activeOrgId && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Teams"
                    render={
                      <NavLink to={`/organizations/${activeOrgId}/teams`} />
                    }
                  >
                    <UsersIcon />
                    <span>Teams</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{/* [TODO]... */}</SidebarFooter>
    </Sidebar>
  );
};
