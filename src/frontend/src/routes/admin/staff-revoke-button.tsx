import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useEffect, useState, type FC } from 'react';

export type StaffRevokeButtonProps = {
  userId: string;
};

const CONFIRM_TIMEOUT_MS = 5_000;

export const StaffRevokeButton: FC<StaffRevokeButtonProps> = ({ userId }) => {
  const { revokeStaffPermissions } = useAppStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-revert the confirm prompt so a forgotten armed button doesn't
  // sit waiting for an accidental click.
  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  async function onConfirm(): Promise<void> {
    setIsSaving(true);
    try {
      await revokeStaffPermissions(userId);
      showSuccessToast('Staff permissions revoked');
    } catch (err) {
      showErrorToast('Failed to revoke staff permissions', err);
    } finally {
      setIsSaving(false);
      setIsConfirming(false);
    }
  }

  if (!isConfirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsConfirming(true)}>
        Revoke
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <LoadingButton
        variant="destructive"
        size="sm"
        onClick={onConfirm}
        isLoading={isSaving}
      >
        Confirm revoke
      </LoadingButton>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsConfirming(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>
    </div>
  );
};
