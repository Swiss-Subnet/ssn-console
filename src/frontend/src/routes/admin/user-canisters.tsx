import { Container } from '@/components/layout/container';
import { LoadingSpinner } from '@/components/loading-spinner';
import { H1 } from '@/components/typography/h1';
import { useRequireAdminAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useEffect, useState, type FC } from 'react';
import { useParams, Link } from 'react-router';
import {
  type ListUserCanistersResponse,
  type Canister,
} from '@/lib/api-models';
import { showErrorToast } from '@/lib/toast';
import { UserCanisterCard } from '@/routes/admin/user-canister-card';

const UserCanisters: FC = () => {
  useRequireAdminAuth();

  const { userId } = useParams<{ userId: string }>();
  const { canisterApi } = useAppStore();
  const [canisters, setCanisters] = useState<Canister[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setIsLoading(true);

    canisterApi
      .listUserCanisters({ user_id: userId })
      .then((res: ListUserCanistersResponse) => {
        if (isMounted) {
          setCanisters(res.canisters);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          showErrorToast('Failed to fetch user canisters', err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, canisterApi]);

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          &larr; Back to Admin
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <H1>User Canisters</H1>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner className="text-primary h-8 w-8" />
          </div>
        ) : canisters && canisters.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {canisters.map(canister => (
              <UserCanisterCard key={canister.id} canister={canister} />
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
