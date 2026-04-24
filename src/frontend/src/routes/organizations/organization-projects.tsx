import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/lib/api-models';
import { FolderKanban } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';

interface OrganizationProjectsProps {
  orgId: string;
  projects: Project[];
  canCreateProject: boolean;
}

export const OrganizationProjects: FC<OrganizationProjectsProps> = ({
  orgId,
  projects,
  canCreateProject,
}) => {
  const navigate = useNavigate();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Projects in this organization.
        </p>

        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            No projects yet.
          </p>
        ) : (
          <ul className="divide-y">
            {projects.map(p => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{p.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/organizations/${orgId}/projects/${p.id}/settings`,
                    )
                  }
                >
                  Manage
                </Button>
              </li>
            ))}
          </ul>
        )}

        {canCreateProject && (
          <Button
            variant="outline"
            onClick={() => navigate(`/organizations/${orgId}/projects`)}
          >
            <FolderKanban className="mr-1 size-3.5" />
            Manage Projects
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
