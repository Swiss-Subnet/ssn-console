import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { Plus } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { selectOrgMap } from '@/lib/store';
import type { Team } from '@/lib/api-models';

const TeamList: FC = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { loadOrgTeams } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);
  const organization = orgId ? orgMap.get(orgId) : undefined;

  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isNil(orgId)) return;

    async function load() {
      try {
        const result = await loadOrgTeams(orgId!);
        setTeams(result);
      } catch (err) {
        showErrorToast('Failed to load teams', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [orgId, loadOrgTeams]);

  if (isNil(orgId) || isNil(organization)) {
    return (
      <Container>
        <p className="text-muted-foreground">Organization not found.</p>
      </Container>
    );
  }

  return (
    <Container>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/canisters' },
          {
            label: organization.name,
            to: `/organizations/${orgId}/settings`,
          },
          { label: 'Teams' },
        ]}
      />

      <div className="mx-auto mt-6 max-w-md space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teams in {organization.name}</CardTitle>

            <Button
              size="sm"
              onClick={() => navigate(`/organizations/${orgId}/teams/new`)}
            >
              <Plus className="mr-1 size-3.5" />
              New Team
            </Button>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : teams.length === 0 ? (
              <p className="text-muted-foreground text-sm">No teams found.</p>
            ) : (
              <ul className="divide-y">
                {teams.map(team => (
                  <li key={team.id}>
                    <button
                      className="hover:bg-muted w-full px-2 py-3 text-left text-sm transition-colors"
                      onClick={() =>
                        navigate(
                          `/organizations/${orgId}/teams/${team.id}/settings`,
                        )
                      }
                    >
                      {team.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default TeamList;
