import { Breadcrumbs } from '@/components/breadcrumbs';
import { Container } from '@/components/layout/container';
import { LoadingSpinner } from '@/components/loading-spinner';
import { H1 } from '@/components/typography/h1';
import { useAppStore } from '@/lib/store';
import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router';
import {
  type ListUserCanistersResponse,
  type Canister,
} from '@/lib/api-models';
import { showErrorToast } from '@/lib/toast';
import { UserCanisterCard } from '@/routes/admin/user-canister-card';

const UserCanisters: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { canisterApi } = useAppStore();
  const [canisters, setCanisters] = useState<Canister[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(true);

    fetchCanisters().finally(() => {
      setIsLoading(false);
    });
  }, [userId, canisterApi]);

  return (
    <Container>
      <Breadcrumbs
        items={[
          { label: 'Admin', to: '/admin' },
          { label: 'Users', to: '/admin/users' },
          { label: 'Canisters' },
        ]}
      />

      <H1 className="mt-3">User Canisters</H1>

      <div className="mt-8">
        {isLoading ? (
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
          <p className="text-muted-foreground">This user has no canisters.</p>
        )}
      </div>
    </Container>
  );
};

export default UserCanisters;
