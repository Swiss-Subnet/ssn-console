import { LoadingButton } from '@/components/loading-button';
import { WidthLock } from '@/components/width-lock';
import { UserStatus, type UserProfile } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { useState, type FC } from 'react';

export type UserStatusButtonProps = {
  user: UserProfile;
};

export const UserStatusToggle: FC<UserStatusButtonProps> = ({ user }) => {
  const { activateUser, deactivateUser } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const isActive = user.status === UserStatus.Active;

  async function onButtonClicked(userId: string): Promise<void> {
    setIsSaving(true);

    try {
      if (isActive) {
        await deactivateUser(userId);
      } else {
        await activateUser(userId);
      }
    } catch (err) {
      showErrorToast('Failed to set user status', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <LoadingButton
      variant={isActive ? 'destructive' : 'outline'}
      size="sm"
      onClick={() => onButtonClicked(user.id)}
      isLoading={isSaving}
    >
      <WidthLock activeId={isActive ? 'deactivate' : 'activate'}>
        <span key="activate">Activate</span>
        <span key="deactivate">Deactivate</span>
      </WidthLock>
    </LoadingButton>
  );
};
