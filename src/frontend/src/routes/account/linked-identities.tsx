import { Container } from '@/components/layout/container';
import { BACKEND_CANISTER_ID } from '@/env';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Principal } from '@icp-sdk/core/principal';
import { ClipboardIcon, RefreshCwIcon, TerminalIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import type { PendingLinkCode } from '@/lib/api-models';

const LINK_CODE_LEN = 8;
const LINK_CODE_PATTERN = /^[A-Z0-9]{8}$/;

const LinkedIdentities: FC = () => {
  const {
    identity,
    linkedPrincipals,
    pendingLinkCodes,
    loadLinkedPrincipals,
    loadPendingLinkCodes,
    createLinkCode,
    linkMyPrincipal,
    unlinkMyPrincipal,
    revokeLinkCode,
  } = useAppStore();

  const currentPrincipal = useMemo(
    () => identity?.getPrincipal().toString() ?? null,
    [identity],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      loadLinkedPrincipals().catch(err =>
        showErrorToast('Failed to load linked identities', err),
      ),
      loadPendingLinkCodes().catch(err =>
        showErrorToast('Failed to load pending link codes', err),
      ),
    ]);
  }, [loadLinkedPrincipals, loadPendingLinkCodes]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Linked identities</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sign in to this account from any of these principals. Useful for
              attaching a dfx CLI identity.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRefresh()}
            disabled={isRefreshing}
            aria-label="Refresh"
          >
            <RefreshCwIcon
              className={isRefreshing ? 'animate-spin' : undefined}
            />
            Refresh
          </Button>
        </div>

        <CurrentlyLinkedCard
          linkedPrincipals={linkedPrincipals}
          currentPrincipal={currentPrincipal}
          onUnlink={unlinkMyPrincipal}
          onAfterUnlink={loadLinkedPrincipals}
        />

        <PendingCodesCard
          pendingLinkCodes={pendingLinkCodes}
          onRevoke={revokeLinkCode}
        />

        <AddIdentityCard
          createLinkCode={createLinkCode}
          linkMyPrincipal={linkMyPrincipal}
          onAfterLink={refresh}
          pendingLinkCodes={pendingLinkCodes}
        />
      </div>
    </Container>
  );
};

type CurrentlyLinkedCardProps = {
  linkedPrincipals: string[] | null;
  currentPrincipal: string | null;
  onUnlink: (principal: string) => Promise<void>;
  onAfterUnlink: () => Promise<void>;
};

const CurrentlyLinkedCard: FC<CurrentlyLinkedCardProps> = ({
  linkedPrincipals,
  currentPrincipal,
  onUnlink,
  onAfterUnlink,
}) => {
  const [busyPrincipal, setBusyPrincipal] = useState<string | null>(null);
  const [confirmPrincipal, setConfirmPrincipal] = useState<string | null>(null);

  async function handleUnlink(principal: string): Promise<void> {
    if (confirmPrincipal !== principal) {
      setConfirmPrincipal(principal);
      return;
    }
    setBusyPrincipal(principal);
    try {
      await onUnlink(principal);
      showSuccessToast('Identity unlinked');
      await onAfterUnlink();
    } catch (err) {
      showErrorToast('Failed to unlink identity', err);
    } finally {
      setBusyPrincipal(null);
      setConfirmPrincipal(null);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Currently linked</CardTitle>
      </CardHeader>

      <CardContent>
        {linkedPrincipals === null ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : linkedPrincipals.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No principals linked yet.
          </p>
        ) : (
          <ul className="divide-y">
            {linkedPrincipals.map(p => {
              const isCurrent = p === currentPrincipal;
              const isConfirming = confirmPrincipal === p;
              return (
                <li
                  key={p}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{p}</p>
                    {isCurrent && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        This device
                      </p>
                    )}
                  </div>
                  <LoadingButton
                    size="sm"
                    variant={isConfirming ? 'destructive' : 'outline'}
                    isLoading={busyPrincipal === p}
                    onClick={() => handleUnlink(p)}
                  >
                    {isConfirming ? 'Click again to confirm' : 'Unlink'}
                  </LoadingButton>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

type PendingCodesCardProps = {
  pendingLinkCodes: PendingLinkCode[] | null;
  onRevoke: (code: string) => Promise<void>;
};

const PendingCodesCard: FC<PendingCodesCardProps> = ({
  pendingLinkCodes,
  onRevoke,
}) => {
  const [busyCode, setBusyCode] = useState<string | null>(null);

  async function handleRevoke(code: string): Promise<void> {
    setBusyCode(code);
    try {
      await onRevoke(code);
      showSuccessToast('Link code revoked');
    } catch (err) {
      showErrorToast('Failed to revoke link code', err);
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Pending link codes</CardTitle>
      </CardHeader>

      <CardContent>
        {pendingLinkCodes === null ? (
          <Skeleton className="h-8 w-full" />
        ) : pendingLinkCodes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No pending codes. Generate one below to attach a new identity.
          </p>
        ) : (
          <ul className="divide-y">
            {pendingLinkCodes.map(c => (
              <PendingCodeRow
                key={c.code}
                pending={c}
                isBusy={busyCode === c.code}
                onRevoke={() => handleRevoke(c.code)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

type PendingCodeRowProps = {
  pending: PendingLinkCode;
  isBusy: boolean;
  onRevoke: () => void;
};

const PendingCodeRow: FC<PendingCodeRowProps> = ({
  pending,
  isBusy,
  onRevoke,
}) => {
  const expiresAtMs = useMemo(
    () => Number(pending.expiresAtNanos / 1_000_000n),
    [pending.expiresAtNanos],
  );
  const remainingMs = useExpiryCountdown(expiresAtMs);
  const isExpired = remainingMs !== null && remainingMs <= 0;

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <code className="font-mono text-sm tracking-widest">
          {pending.code}
        </code>
        <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
          For {pending.targetPrincipal}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {isExpired
            ? 'Expired'
            : remainingMs !== null
              ? `Expires in ${formatRemaining(remainingMs)}`
              : ''}
        </p>
      </div>
      <LoadingButton
        size="sm"
        variant="outline"
        isLoading={isBusy}
        onClick={onRevoke}
      >
        Revoke
      </LoadingButton>
    </li>
  );
};

type AddIdentityCardProps = {
  createLinkCode: (
    targetPrincipal: string,
  ) => Promise<{ code: string; expiresAtNanos: bigint }>;
  linkMyPrincipal: (code: string) => Promise<void>;
  onAfterLink: () => Promise<void>;
  pendingLinkCodes: PendingLinkCode[] | null;
};

const AddIdentityCard: FC<AddIdentityCardProps> = ({
  createLinkCode,
  linkMyPrincipal,
  onAfterLink,
  pendingLinkCodes,
}) => {
  const [targetPrincipal, setTargetPrincipal] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAtMs, setCodeExpiresAtMs] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [enteredCode, setEnteredCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Clear the displayed code when it stops being a live pending code
  // (revoked from the list above, expired, or consumed by a successful
  // link in another tab). Skip while pendingLinkCodes is still loading
  // (null) so we don't blow it away during the initial fetch.
  useEffect(() => {
    if (generatedCode === null) return;
    if (pendingLinkCodes === null) return;
    const stillPending = pendingLinkCodes.some(c => c.code === generatedCode);
    if (!stillPending) {
      setGeneratedCode(null);
      setCodeExpiresAtMs(null);
    }
  }, [generatedCode, pendingLinkCodes]);

  const remainingMs = useExpiryCountdown(codeExpiresAtMs);

  async function handleGenerate(): Promise<void> {
    const trimmedTarget = targetPrincipal.trim();
    let parsedTarget: string;
    try {
      parsedTarget = Principal.fromText(trimmedTarget).toText();
    } catch (err) {
      showErrorToast('Invalid principal', err);
      return;
    }

    setIsGenerating(true);
    try {
      const { code, expiresAtNanos } = await createLinkCode(parsedTarget);
      setGeneratedCode(code);
      setCodeExpiresAtMs(Number(expiresAtNanos / 1_000_000n));
    } catch (err) {
      showErrorToast('Failed to generate link code', err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (generatedCode === null) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      showSuccessToast('Code copied to clipboard');
    } catch (err) {
      showErrorToast('Failed to copy code', err);
    }
  }

  async function handleCopyDfxCommand(): Promise<void> {
    if (generatedCode === null) return;
    const command = dfxLinkCommand(generatedCode);
    try {
      await navigator.clipboard.writeText(command);
      showSuccessToast('Command copied to clipboard');
    } catch (err) {
      showErrorToast('Failed to copy command', err);
    }
  }

  async function handleLink(): Promise<void> {
    const code = enteredCode.trim().toUpperCase();
    if (!LINK_CODE_PATTERN.test(code)) {
      showErrorToast(
        'Invalid link code',
        new Error('Link code must be 8 characters (A-Z, 0-9).'),
      );
      return;
    }
    setIsLinking(true);
    try {
      await linkMyPrincipal(code);
      showSuccessToast('Identity linked');
      setEnteredCode('');
      await onAfterLink();
    } catch (err) {
      showErrorToast('Failed to link identity', err);
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Add another identity</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Generate a link code</h3>
          <p className="text-muted-foreground text-xs">
            Enter the principal you want to attach (for example, the output of{' '}
            <code className="font-mono">dfx identity get-principal</code>), then
            generate a code. The code only works when redeemed by that exact
            principal.
          </p>

          <Input
            value={targetPrincipal}
            onChange={e => setTargetPrincipal(e.target.value)}
            placeholder="aaaaa-aa..."
            disabled={generatedCode !== null}
            className="font-mono text-xs"
          />

          {generatedCode === null ? (
            <LoadingButton
              size="sm"
              isLoading={isGenerating}
              disabled={targetPrincipal.trim().length === 0}
              onClick={() => handleGenerate()}
            >
              Generate code
            </LoadingButton>
          ) : (
            <div className="flex items-center gap-2">
              <code className="bg-muted rounded-md px-3 py-1.5 font-mono text-sm tracking-widest">
                {generatedCode}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCopy()}
                aria-label="Copy code"
              >
                <ClipboardIcon />
              </Button>
              <span className="text-muted-foreground text-xs">
                {remainingMs !== null && remainingMs > 0
                  ? `Expires in ${formatRemaining(remainingMs)}`
                  : 'Expired'}
              </span>
              <LoadingButton
                size="sm"
                variant="outline"
                className="ml-auto"
                isLoading={isGenerating}
                onClick={() => handleGenerate()}
              >
                Regenerate
              </LoadingButton>
            </div>
          )}

          {generatedCode !== null && (
            <div className="bg-muted/40 mt-3 space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4" />
                <h4 className="text-xs font-medium">Link via dfx</h4>
              </div>
              <p className="text-muted-foreground text-xs">
                Run this from a shell where your dfx identity is selected (e.g.{' '}
                <code className="font-mono">dfx identity use ...</code>). The
                selected identity&apos;s principal must match the target you
                entered above, otherwise the code is rejected and burned.
              </p>
              <div className="flex items-start gap-2">
                <pre className="bg-background flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs">
                  {dfxLinkCommand(generatedCode)}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopyDfxCommand()}
                  aria-label="Copy dfx command"
                >
                  <ClipboardIcon />
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">I have a link code</h3>
          <p className="text-muted-foreground text-xs">
            Paste a code generated from another identity to attach this
            principal to that account.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={enteredCode}
              onChange={e => setEnteredCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              maxLength={LINK_CODE_LEN}
              className="font-mono tracking-widest uppercase"
            />
            <LoadingButton
              size="sm"
              isLoading={isLinking}
              onClick={() => handleLink()}
            >
              Link this principal
            </LoadingButton>
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

function useExpiryCountdown(expiresAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  if (expiresAt === null) return null;
  return Math.max(0, expiresAt - now);
}

function dfxLinkCommand(code: string): string {
  return `dfx canister call ${BACKEND_CANISTER_ID} link_my_principal '(record { code = "${code}" })'`;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default LinkedIdentities;
