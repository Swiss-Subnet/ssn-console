import { CanisterStatus, type Canister } from '@/lib/api-models';
import { formatBytes, formatCycles } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type FC } from 'react';

export type UserCanisterCardProps = {
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

export const UserCanisterCard: FC<UserCanisterCardProps> = ({ canister }) => {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Canister</CardTitle>
        <CardDescription className="truncate font-mono">
          {canister.principal}
        </CardDescription>
        {canister.info && (
          <CardAction>
            <Badge variant={statusBadgeVariant(canister.info.status)}>
              {canister.info.status}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      {canister.info && (
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground mb-0.5">Cycles</div>
              <div className="font-medium">
                {formatCycles(canister.info.cycles)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Memory</div>
              <div className="font-medium">
                {formatBytes(canister.info.memorySize)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Burn / day</div>
              <div className="font-medium">
                {formatCycles(canister.info.idleCyclesBurnedPerDay)}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
