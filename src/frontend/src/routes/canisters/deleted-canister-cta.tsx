import { LoadingButton } from '@/components/loading-button';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useRequireProjectId } from '@/lib/params';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { AlertCircleIcon } from 'lucide-react';
import { useState, type FC } from 'react';

export type DeletedCanisterCtaProps = {
  canisterRecordId: string;
  canisterPrincipal: string;
};

export const DeletedCanisterCta: FC<DeletedCanisterCtaProps> = ({
  canisterRecordId,
  canisterPrincipal,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const { removeCanister } = useAppStore();
  const projectId = useRequireProjectId();

  async function onRemoveClicked(): Promise<void> {
    setIsRemoving(true);
    try {
      await removeCanister(canisterRecordId, projectId);
    } catch (err) {
      showErrorToast('Failed to remove canister', err);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircleIcon />
      <AlertTitle>Canister no longer exists</AlertTitle>
      <AlertDescription>
        Canister {canisterPrincipal} was deleted from the network. You can
        remove it from this dashboard.
      </AlertDescription>

      <AlertAction>
        <LoadingButton
          size="sm"
          variant="default"
          onClick={() => onRemoveClicked()}
          isLoading={isRemoving}
        >
          Remove
        </LoadingButton>
      </AlertAction>
    </Alert>
  );
};
