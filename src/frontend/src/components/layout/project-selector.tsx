import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { ChevronsUpDown } from 'lucide-react';
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium">
                {activeProject?.name}
              </span>

              <span className="truncate text-xs">
                {activeOrganization?.name}
              </span>
            </div>

            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side={isMobile ? 'bottom' : 'right'}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>

              {orgsWithProjects.map(orgWithProjects => (
                <DropdownMenuSub key={orgWithProjects.id}>
                  <DropdownMenuSubTrigger className="p-2">
                    {orgWithProjects.name}
                  </DropdownMenuSubTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel>Projects</DropdownMenuLabel>

                      {orgWithProjects.projects.map(project => (
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
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
