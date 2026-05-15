import { LoadingButton } from '@/components/loading-button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Principal } from '@icp-sdk/core/principal';
import { useCallback, useEffect, useState, type FC } from 'react';

export type UserLinkedPrincipalsProps = {
  userId: string;
};

const CONFIRM_TIMEOUT_MS = 5_000;

export const UserLinkedPrincipals: FC<UserLinkedPrincipalsProps> = ({
  userId,
}) => {
  const { principalLinkApi } = useAppStore();
  const [principals, setPrincipals] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newPrincipal, setNewPrincipal] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await principalLinkApi.adminListLinkedPrincipals(userId);
      setPrincipals(list);
    } catch (err) {
      showErrorToast('Failed to load linked principals', err);
    }
  }, [principalLinkApi, userId]);

  useEffect(() => {
    setIsLoading(true);
    reload().finally(() => setIsLoading(false));
  }, [reload]);

  async function onLink(): Promise<void> {
    const trimmed = newPrincipal.trim();
    if (trimmed === '') return;
    // Validate locally so the user gets a clear error before the canister
    // round-trip; the backend also rejects malformed principals, but it
    // surfaces them as a generic "cannot be linked" message that masks the
    // shape error to avoid being an existence oracle for valid principals.
    try {
      Principal.fromText(trimmed);
    } catch {
      showErrorToast(
        'Invalid principal',
        new Error('Principal must be a valid textual principal ID.'),
      );
      return;
    }

    setIsLinking(true);
    try {
      await principalLinkApi.adminLinkPrincipalToUser(userId, trimmed);
      showSuccessToast('Principal linked');
      setNewPrincipal('');
      await reload();
    } catch (err) {
      showErrorToast('Failed to link principal', err);
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex h-16 items-center">
          <LoadingSpinner className="text-primary h-6 w-6" />
        </div>
      ) : principals && principals.length > 0 ? (
        <ul className="divide-border divide-y rounded-md border">
          {principals.map(principal => (
            <li
              key={principal}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="font-mono text-xs break-all">{principal}</span>
              <UnlinkButton
                userId={userId}
                principal={principal}
                disableUnlink={principals.length <= 1}
                onUnlinked={reload}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No principals linked. This should not happen for an existing user.
        </p>
      )}

      <div className="mt-4 flex items-start gap-2">
        <Input
          value={newPrincipal}
          onChange={e => setNewPrincipal(e.target.value)}
          placeholder="abcde-fghij-..."
          className="font-mono text-xs"
          disabled={isLinking}
        />
        <LoadingButton
          variant="outline"
          onClick={onLink}
          isLoading={isLinking}
          disabled={newPrincipal.trim() === ''}
        >
          Link principal
        </LoadingButton>
      </div>
    </div>
  );
};

type UnlinkButtonProps = {
  userId: string;
  principal: string;
  disableUnlink: boolean;
  onUnlinked: () => Promise<void>;
};

const UnlinkButton: FC<UnlinkButtonProps> = ({
  userId,
  principal,
  disableUnlink,
  onUnlinked,
}) => {
  const { principalLinkApi } = useAppStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Match the staff-revoke pattern: arm-then-confirm with a timeout so a
  // forgotten armed button does not sit waiting for an accidental click.
  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  async function onConfirm(): Promise<void> {
    setIsSaving(true);
    try {
      await principalLinkApi.adminUnlinkPrincipalFromUser(userId, principal);
      showSuccessToast('Principal unlinked');
      await onUnlinked();
    } catch (err) {
      showErrorToast('Failed to unlink principal', err);
    } finally {
      setIsSaving(false);
      setIsConfirming(false);
    }
  }

  if (disableUnlink) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Cannot unlink the user's only remaining principal."
      >
        Unlink
      </Button>
    );
  }

  if (!isConfirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsConfirming(true)}>
        Unlink
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
        Confirm unlink
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
