import {
  CanisterAvailability,
  CanisterStatus,
  type Canister,
} from '@/lib/api-models';
import { formatBytes, formatCycles } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/loading-button';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, type FC } from 'react';

export type UserCanisterCardProps = {
  canister: Canister;
  onStatusChange?: () => void | Promise<void>;
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

export const UserCanisterCard: FC<UserCanisterCardProps> = ({
  canister,
  onStatusChange,
}) => {
  const { managementCanisterApi } = useAppStore();
  const [isActionLoading, setIsActionLoading] = useState(false);

  const info =
    canister.state.availability === CanisterAvailability.Accessible
      ? canister.state.info
      : null;

  const handleStart = async () => {
    try {
      setIsActionLoading(true);
      await managementCanisterApi.startCanister({
        canisterId: canister.principal,
      });
      await onStatusChange?.();
      showSuccessToast('Canister started successfully');
    } catch (err) {
      showErrorToast('Failed to start canister', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsActionLoading(true);
      await managementCanisterApi.stopCanister({
        canisterId: canister.principal,
      });
      await onStatusChange?.();
      showSuccessToast('Canister stopped successfully');
    } catch (err) {
      showErrorToast('Failed to stop canister', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsActionLoading(true);
      await managementCanisterApi.deleteCanister({
        canisterId: canister.principal,
      });
      await onStatusChange?.();
      showSuccessToast('Canister deleted successfully');
    } catch (err) {
      showErrorToast('Failed to delete canister', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Canister</CardTitle>
        <CardDescription className="truncate font-mono">
          {canister.principal}
        </CardDescription>
        {info && (
          <CardAction className="flex items-center gap-2">
            {info.status === CanisterStatus.Stopped && (
              <>
                <LoadingButton
                  variant="outline"
                  size="xs"
                  onClick={handleStart}
                  isLoading={isActionLoading}
                >
                  Start
                </LoadingButton>
                <LoadingButton
                  variant="outline"
                  size="xs"
                  onClick={handleDelete}
                  isLoading={isActionLoading}
                >
                  Delete
                </LoadingButton>
              </>
            )}
            {info.status === CanisterStatus.Running && (
              <LoadingButton
                variant="outline"
                size="xs"
                onClick={handleStop}
                isLoading={isActionLoading}
              >
                Stop
              </LoadingButton>
            )}
            <Badge variant={statusBadgeVariant(info.status)}>
              {info.status}
            </Badge>
          </CardAction>
        )}
        {canister.state.availability === CanisterAvailability.Deleted && (
          <CardAction className="flex items-center gap-2">
            <Badge variant="destructive">Deleted</Badge>
          </CardAction>
        )}
      </CardHeader>

      {info && (
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground mb-0.5">Cycles</div>
              <div className="font-medium">{formatCycles(info.cycles)}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Memory</div>
              <div className="font-medium">{formatBytes(info.memorySize)}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Burn / day</div>
              <div className="font-medium">
                {formatCycles(info.idleCyclesBurnedPerDay)}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
