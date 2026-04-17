import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Team } from '@/lib/api-models';
import { Users } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';

interface OrganizationTeamsProps {
  orgId: string;
  teams: Team[];
}

export const OrganizationTeams: FC<OrganizationTeamsProps> = ({
  orgId,
  teams,
}) => {
  const navigate = useNavigate();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Teams</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Manage the teams in this organization.
        </p>

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No teams yet.</p>
        ) : (
          <ul className="divide-y">
            {teams.map(t => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span>{t.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(`/organizations/${orgId}/teams/${t.id}/settings`)
                  }
                >
                  Manage
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="outline"
          onClick={() => navigate(`/organizations/${orgId}/teams`)}
        >
          <Users className="mr-1 size-3.5" />
          Manage Teams
        </Button>
      </CardContent>
    </Card>
  );
};
