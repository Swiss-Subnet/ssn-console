import { LoadingButton } from '@/components/loading-button';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { useState, type FC } from 'react';

export type CreateCanisterButtonProps = {
  className?: string;
};

export const CreateCanisterButton: FC<CreateCanisterButtonProps> = ({
  className,
}) => {
  const { createCanister } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);

  async function onCreateCanisterClicked(): Promise<void> {
    setIsCreating(true);
    try {
      await createCanister();
    } catch (err) {
      showErrorToast('Failed to query canister status', err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <LoadingButton
      variant="default"
      isLoading={isCreating}
      className={className}
      onClick={() => onCreateCanisterClicked()}
    >
      Create Canister
    </LoadingButton>
  );
};
