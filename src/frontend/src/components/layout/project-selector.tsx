import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { isNil } from '@/lib/nil';
import { useRequireProjectId } from '@/lib/params';
import {
  selectOrgMap,
  selectOrgsWithProjects,
  selectProjectMap,
  useAppStore,
} from '@/lib/store';
import {
  Building2,
  ChevronsUpDown,
  FolderOpen,
  Plus,
  Settings,
} from 'lucide-react';
import { useMemo, type FC } from 'react';
import { NavLink } from 'react-router';

export const ProjectSelector: FC = () => {
  const { isMobile } = useSidebar();
  const projectId = useRequireProjectId();
  const orgsWithProjects = useAppStore(selectOrgsWithProjects);
  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);

  const activeProject = useMemo(
    () => projectMap.get(projectId) ?? null,
    [projectId, projectMap],
  );

  const activeOrganization = useMemo(() => {
    if (isNil(activeProject)) {
      return null;
    }

    return orgMap.get(activeProject?.orgId);
  }, [activeProject, orgMap]);

  const activeOrgProjects = useMemo(() => {
    if (isNil(activeOrganization)) {
      return [];
    }

    const orgWithProjects = orgsWithProjects.find(
      o => o.id === activeOrganization.id,
    );

    return orgWithProjects?.projects ?? [];
  }, [activeOrganization, orgsWithProjects]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Building2 className="size-4" />

            <div className="flex flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {activeOrganization?.name}
              </span>
            </div>

            <ChevronsUpDown className="ml-auto size-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side={isMobile ? 'bottom' : 'right'}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>

              {orgsWithProjects.map(org => {
                const isActive = org.id === activeOrganization?.id;

                return (
                  <DropdownMenuItem
                    key={org.id}
                    className="p-2"
                    disabled={isActive}
                    render={
                      isActive ? undefined : (
                        <NavLink
                          to={`/projects/${org.projects[0]?.id}/canisters`}
                        />
                      )
                    }
                  >
                    <Building2 className="size-3.5" />
                    {org.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                className="p-2"
                render={<NavLink to="/organizations/new" />}
              >
                <Plus className="size-3.5" />
                Create Organization
              </DropdownMenuItem>

              {activeOrganization && (
                <DropdownMenuItem
                  className="p-2"
                  render={
                    <NavLink
                      to={`/organizations/${activeOrganization.id}/settings`}
                    />
                  }
                >
                  <Settings className="size-3.5" />
                  Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <SidebarMenuItem>
        {activeOrgProjects.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton />}>
              <FolderOpen className="size-4" />

              <div className="flex flex-1 flex-col">
                <span className="truncate text-sm">{activeProject?.name}</span>
              </div>

              <ChevronsUpDown className="ml-auto size-3.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent side={isMobile ? 'bottom' : 'right'}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Projects</DropdownMenuLabel>

                {activeOrgProjects.map(project => (
                  <DropdownMenuItem
                    key={project.id}
                    className="p-2"
                    render={
                      <NavLink to={`/projects/${project.id}/canisters`} />
                    }
                  >
                    {project.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton>
            <FolderOpen className="size-4" />

            <span className="truncate text-sm">{activeProject?.name}</span>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
