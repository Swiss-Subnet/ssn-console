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

export type AddMissingCanisterControllerCtaParams = {
  canisterId: string;
};

export const AddMissingCanisterControllerCta: FC<
  AddMissingCanisterControllerCtaParams
> = ({ canisterId }) => {
  const [isAddingController, setIsAddingController] = useState(false);
  const { addMissingController } = useAppStore();
  const projectId = useRequireProjectId();

  async function onFixClicked(): Promise<void> {
    setIsAddingController(true);

    try {
      await addMissingController(canisterId, projectId);
    } catch (err) {
      showErrorToast('Failed to add missing controller', err);
    } finally {
      setIsAddingController(false);
    }
  }

  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircleIcon />
      <AlertTitle>Missing Controller</AlertTitle>
      <AlertDescription>
        The Swiss Subnet Console Canister must be added as a controller of this
        canister.
      </AlertDescription>

      <AlertAction>
        <LoadingButton
          size="sm"
          variant="default"
          onClick={() => onFixClicked()}
          isLoading={isAddingController}
        >
          Fix
        </LoadingButton>
      </AlertAction>
    </Alert>
  );
};
