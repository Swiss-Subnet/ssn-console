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
import {
  selectOrgMap,
  selectOrgsWithProjects,
  selectProjectMap,
  useAppStore,
} from '@/lib/store';
import { ChevronsUpDown, FolderOpen, Plus, Settings } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { NavLink, useParams } from 'react-router';

export const ProjectSelector: FC = () => {
  const { isMobile } = useSidebar();
  const { projectId: projectIdParam } = useParams();
  const orgsWithProjects = useAppStore(selectOrgsWithProjects);
  const projectMap = useAppStore(selectProjectMap);
  const orgMap = useAppStore(selectOrgMap);
  const projects = useAppStore(s => s.projects);

  const activeProjectId = projectIdParam ?? projects[0]?.id;

  const activeProject = useMemo(
    () =>
      isNil(activeProjectId) ? null : (projectMap.get(activeProjectId) ?? null),
    [activeProjectId, projectMap],
  );

  const activeOrganization = useMemo(() => {
    if (isNil(activeProject)) {
      return null;
    }

    return orgMap.get(activeProject.orgId);
  }, [activeProject, orgMap]);

  const activeOrgProjects = useMemo(() => {
    if (isNil(activeOrganization)) {
      return [];
    }

    const activeOrgWithProjects = orgsWithProjects.find(
      o => o.id === activeOrganization.id,
    );

    return activeOrgWithProjects?.projects ?? [];
  }, [activeOrganization, orgsWithProjects]);

  if (isNil(activeProject) || isNil(activeOrganization)) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <FolderOpen className="size-4" />

            <div className="flex flex-1 flex-col">
              <span className="truncate text-sm">{activeProject.name}</span>
            </div>

            <ChevronsUpDown className="ml-auto size-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side={isMobile ? 'bottom' : 'right'}>
            {activeOrgProjects.length > 1 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Switch Project</DropdownMenuLabel>

                  {activeOrgProjects.map(project => {
                    const isActive = project.id === activeProject.id;

                    return (
                      <DropdownMenuItem
                        key={project.id}
                        className="p-2"
                        disabled={isActive}
                        {...(!isActive && {
                          render: (
                            <NavLink to={`/projects/${project.id}/canisters`} />
                          ),
                        })}
                      >
                        <FolderOpen className="size-3.5" />
                        {project.name}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuGroup>
              <DropdownMenuItem
                className="p-2"
                render={
                  <NavLink
                    to={`/organizations/${activeOrganization.id}/projects/new`}
                  />
                }
              >
                <Plus className="size-3.5" />
                Create Project
              </DropdownMenuItem>

              <DropdownMenuItem
                className="p-2"
                render={
                  <NavLink
                    to={`/organizations/${activeOrganization.id}/projects/${activeProject.id}/settings`}
                  />
                }
              >
                <Settings className="size-3.5" />
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
