import { LoadingButton } from '@/components/loading-button';
import { useAppStore } from '@/lib/store';
import { useState, type FC } from 'react';

export type CreateCanisterButtonProps = {
  className?: string;
};

export const CreateCanisterButton: FC<CreateCanisterButtonProps> = ({
  className,
}) => {
  const { createCanister } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);

  async function onButtonClicked(): Promise<void> {
    setIsCreating(true);
    try {
      await createCanister();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <LoadingButton
      variant="default"
      isLoading={isCreating}
      className={className}
      onClick={() => onButtonClicked()}
    >
      Create Canister
    </LoadingButton>
  );
};
