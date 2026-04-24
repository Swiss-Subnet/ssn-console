import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { selectOrgMap } from '@/lib/store';
import type { OrgPermissions, OrgTeam } from '@/lib/api-models';

const PERMISSION_CHIPS: { key: keyof OrgPermissions; label: string }[] = [
  { key: 'memberManage', label: 'Members' },
  { key: 'teamManage', label: 'Teams' },
  { key: 'projectCreate', label: 'Projects' },
  { key: 'billingManage', label: 'Billing' },
];

const TeamPermissionChips: FC<{ permissions: OrgPermissions }> = ({
  permissions,
}) => {
  if (permissions.orgAdmin) {
    return <Badge variant="default">Admin</Badge>;
  }

  const granted = PERMISSION_CHIPS.filter(({ key }) => permissions[key]);

  if (granted.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No permissions
      </Badge>
    );
  }

  return (
    <>
      {granted.map(({ key, label }) => (
        <Badge key={key} variant="secondary">
          {label}
        </Badge>
      ))}
    </>
  );
};

const TeamList: FC = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { loadOrgTeams } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);
  const organization = orgId ? orgMap.get(orgId) : undefined;

  const [teams, setTeams] = useState<OrgTeam[]>([]);
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

  const canManageTeams = organization.yourPermissions.teamManage;

  return (
    <Container>
      <Breadcrumbs
        items={[
          {
            label: organization.name,
            to: `/organizations/${orgId}/settings`,
          },
          { label: 'Teams' },
        ]}
      />

      <div className="mx-auto mt-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teams in {organization.name}</CardTitle>

            {canManageTeams && (
              <Button
                size="sm"
                onClick={() => navigate(`/organizations/${orgId}/teams/new`)}
              >
                <Plus className="mr-1 size-3.5" />
                New Team
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-muted-foreground text-sm">No teams yet.</p>
                {canManageTeams && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/organizations/${orgId}/teams/new`)
                    }
                  >
                    <Plus className="mr-1 size-3.5" />
                    Create your first team
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {teams.map(team => (
                  <li key={team.id}>
                    <button
                      className="hover:bg-muted flex w-full items-center gap-3 px-2 py-3 text-left transition-colors"
                      onClick={() =>
                        navigate(
                          `/organizations/${orgId}/teams/${team.id}/settings`,
                        )
                      }
                    >
                      <Users className="text-muted-foreground size-4 shrink-0" />
                      <span className="flex-1 truncate text-sm font-medium">
                        {team.name}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        <TeamPermissionChips permissions={team.permissions} />
                      </div>
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
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
