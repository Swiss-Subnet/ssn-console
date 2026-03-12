import { LoadingButton } from '@/components/loading-button';
import { useRequireProjectId } from '@/lib/params';
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
  const projectId = useRequireProjectId();
  const [isCreating, setIsCreating] = useState(false);

  async function onCreateCanisterClicked(): Promise<void> {
    setIsCreating(true);
    try {
      await createCanister(projectId);
    } catch (err) {
      showErrorToast('Failed to create canister', err);
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
