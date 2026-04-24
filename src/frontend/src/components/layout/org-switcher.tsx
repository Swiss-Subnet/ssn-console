import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isNil } from '@/lib/nil';
import {
  selectOrgMap,
  selectOrgsWithProjects,
  selectProjectMap,
  useAppStore,
} from '@/lib/store';
import { Building2, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { NavLink, useParams } from 'react-router';

export const OrgSwitcher: FC = () => {
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

  if (orgsWithProjects.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="lg" className="gap-2" />}
      >
        <Building2 className="size-4" />
        <span className="max-w-[180px] truncate">
          {activeOrganization?.name ?? 'Select organization'}
        </span>
        <ChevronsUpDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>

          {orgsWithProjects.map(org => {
            const isActive = org.id === activeOrganization?.id;

            return (
              <DropdownMenuItem
                key={org.id}
                className="p-2"
                disabled={isActive}
                {...(!isActive && {
                  render: (
                    <NavLink
                      to={`/projects/${org.projects[0]?.id}/canisters`}
                    />
                  ),
                })}
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
  );
};
