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
import { CreditCardIcon, LayoutDashboardIcon } from 'lucide-react';
import type { FC } from 'react';
import { NavLink } from 'react-router';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/billing', label: 'Billing', icon: CreditCardIcon },
];

export const AppSidebar: FC = () => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ProjectSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, label, icon: Icon }) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{/* [TODO]... */}</SidebarFooter>
    </Sidebar>
  );
};
