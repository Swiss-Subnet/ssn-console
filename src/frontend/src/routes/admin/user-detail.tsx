import { Breadcrumbs } from '@/components/breadcrumbs';
import { Container } from '@/components/layout/container';
import { LoadingSpinner } from '@/components/loading-spinner';
import { H1 } from '@/components/typography/h1';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type Canister,
  type ListUserCanistersResponse,
} from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { UserCanisterCard } from '@/routes/admin/user-canister-card';
import { UserStatusBadge } from '@/routes/admin/user-status-badge';
import { UserStatusToggle } from '@/routes/admin/user-status-toggle';
import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router';

const UserDetail: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { users, canisterApi } = useAppStore();
  const [canisters, setCanisters] = useState<Canister[] | null>(null);
  const [isLoadingCanisters, setIsLoadingCanisters] = useState(true);

  const user = users?.find(u => u.id === userId) ?? null;

  const fetchCanisters = useCallback(() => {
    if (!userId) return Promise.resolve();

    return canisterApi
      .listUserCanisters({ user_id: userId })
      .then((res: ListUserCanistersResponse) => {
        setCanisters(res.canisters);
      })
      .catch((err: unknown) => {
        showErrorToast('Failed to fetch user canisters', err);
      });
  }, [userId, canisterApi]);

  useEffect(() => {
    setIsLoadingCanisters(true);

    fetchCanisters().finally(() => {
      setIsLoadingCanisters(false);
    });
  }, [userId, canisterApi]);

  return (
    <Container>
      <Breadcrumbs
        items={[
          { label: 'Admin', to: '/admin' },
          { label: 'Users', to: '/admin/users' },
          { label: user?.email ?? userId ?? 'User' },
        ]}
      />

      <H1 className="mt-3">User</H1>

      {!user ? (
        <p className="text-muted-foreground mt-8">User not found.</p>
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardDescription>Principal</CardDescription>
                  <CardTitle className="font-mono text-base break-all">
                    {user.id}
                  </CardTitle>
                </div>
                <UserStatusToggle user={user} />
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <div className="mt-1 flex items-center gap-2">
                  <span>{user.email ?? 'None provided'}</span>
                  {user.email && (
                    <Badge
                      variant={user.emailVerified ? 'success' : 'secondary'}
                    >
                      {user.emailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-1">
                  <UserStatusBadge user={user} />
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <div className="mt-1">
                  <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                    {user.isAdmin ? 'Admin' : 'User'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="mt-8">
            <h2 className="text-base font-medium">Canisters</h2>

            <div className="mt-3">
              {isLoadingCanisters ? (
                <div className="flex h-32 items-center justify-center">
                  <LoadingSpinner className="text-primary h-8 w-8" />
                </div>
              ) : canisters && canisters.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {canisters.map(canister => (
                    <UserCanisterCard
                      key={canister.id}
                      canister={canister}
                      onStatusChange={fetchCanisters}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This user has no canisters.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </Container>
  );
};

export default UserDetail;
