import { type FC } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddMissingCanisterControllerCta } from '@/routes/canisters/add-missing-canister-controller-cta';
import { DeletedCanisterCta } from '@/routes/canisters/deleted-canister-cta';
import {
  CanisterAvailability,
  CanisterStatus,
  type Canister,
} from '@/lib/api-models';
import { formatBytes, formatCycles } from '@/lib/format';
import { useRequireProjectId } from '@/lib/params';
import { Link } from 'react-router';

export type CanisterGridEntryProps = {
  canister: Canister;
};

function statusBadgeVariant(
  status: CanisterStatus,
): 'success' | 'outline' | 'destructive' {
  switch (status) {
    case CanisterStatus.Running:
      return 'success';
    case CanisterStatus.Stopping:
      return 'outline';
    case CanisterStatus.Stopped:
      return 'destructive';
  }
}

export const CanisterGridEntry: FC<CanisterGridEntryProps> = ({ canister }) => {
  const projectId = useRequireProjectId();
  const accessibleInfo =
    canister.state.availability === CanisterAvailability.Accessible
      ? canister.state.info
      : null;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Canister</CardTitle>
          <CardDescription className="truncate font-mono">
            {canister.principal}
          </CardDescription>
          {accessibleInfo && (
            <CardAction>
              <Badge variant={statusBadgeVariant(accessibleInfo.status)}>
                {accessibleInfo.status}
              </Badge>
            </CardAction>
          )}
          {canister.state.availability === CanisterAvailability.Deleted && (
            <CardAction>
              <Badge variant="destructive">Deleted</Badge>
            </CardAction>
          )}
        </CardHeader>

        {accessibleInfo && (
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Cycles</div>
                <div className="font-medium">
                  {formatCycles(accessibleInfo.cycles)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Memory</div>
                <div className="font-medium">
                  {formatBytes(accessibleInfo.memorySize)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Burn / day</div>
                <div className="font-medium">
                  {formatCycles(accessibleInfo.idleCyclesBurnedPerDay)}
                </div>
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter>
          <Link
            to={`/projects/${projectId}/canisters/${canister.id}`}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            View details &rarr;
          </Link>
        </CardFooter>
      </Card>

      {canister.state.availability === CanisterAvailability.Inaccessible && (
        <AddMissingCanisterControllerCta canisterId={canister.principal} />
      )}
      {canister.state.availability === CanisterAvailability.Deleted && (
        <DeletedCanisterCta
          canisterRecordId={canister.id}
          canisterPrincipal={canister.principal}
        />
      )}
    </>
  );
};
