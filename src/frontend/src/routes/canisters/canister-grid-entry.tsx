import { useEffect, useRef, useState, type FC } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddMissingCanisterControllerCta } from '@/routes/canisters/add-missing-canister-controller-cta';
import { DeletedCanisterCta } from '@/routes/canisters/deleted-canister-cta';
import {
  CanisterAvailability,
  CanisterStatus,
  type Canister,
} from '@/lib/api-models';
import { formatBytes, formatCycles } from '@/lib/format';
import { useRequireProjectId } from '@/lib/params';
import { slugifyCanisterName } from '@/lib/project-export/build-zip';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Check, LoaderIcon, Pencil, X } from 'lucide-react';
import { Link } from 'react-router';

export type CanisterGridEntryProps = {
  canister: Canister;
  canEdit: boolean;
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

type EditableCanisterNameProps = { canister: Canister; projectId: string };

const EditableCanisterName: FC<EditableCanisterNameProps> = ({
  canister,
  projectId,
}) => {
  const updateCanisterName = useAppStore(s => s.updateCanisterName);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(canister.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  function startEditing(): void {
    setDraft(canister.name ?? '');
    setIsEditing(true);
  }

  async function onSave(): Promise<void> {
    const trimmed = draft.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    if (next === canister.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateCanisterName(canister.id, projectId, next);
      showSuccessToast(
        next ? 'Canister name updated' : 'Canister name cleared',
      );
      setIsEditing(false);
    } catch (err) {
      showErrorToast('Failed to update canister name', err);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          placeholder="Unnamed canister"
          maxLength={100}
          autoFocus
          disabled={isSaving}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void onSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={isSaving}
          aria-label="Save name"
          onClick={() => void onSave()}
        >
          {isSaving ? <LoaderIcon className="animate-spin" /> : <Check />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={isSaving}
          aria-label="Cancel"
          onClick={() => setIsEditing(false)}
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="group/name flex items-center gap-1">
      <CardTitle className="truncate">{canister.name ?? 'Canister'}</CardTitle>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Rename canister"
        className="opacity-0 transition-opacity group-hover/name:opacity-100 focus-visible:opacity-100"
        onClick={startEditing}
      >
        <Pencil />
      </Button>
    </div>
  );
};

export const CanisterGridEntry: FC<CanisterGridEntryProps> = ({
  canister,
  canEdit,
}) => {
  const projectId = useRequireProjectId();
  const accessibleInfo =
    canister.state.availability === CanisterAvailability.Accessible
      ? canister.state.info
      : null;
  const displayName = canister.name ?? 'Canister';
  const exportSlug = canister.name ? slugifyCanisterName(canister.name) : null;
  const showSlug = exportSlug !== null && exportSlug !== canister.name;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          {canEdit &&
          canister.state.availability !== CanisterAvailability.Deleted ? (
            <EditableCanisterName canister={canister} projectId={projectId} />
          ) : (
            <CardTitle className="truncate">{displayName}</CardTitle>
          )}
          <CardDescription className="truncate font-mono">
            {canister.principal}
          </CardDescription>
          {showSlug && (
            <CardDescription
              className="text-muted-foreground/70 truncate font-mono text-xs"
              title="Folder name used by the project export"
            >
              src/{exportSlug}/
            </CardDescription>
          )}
          {accessibleInfo && (
            <CardAction>
              <Badge variant={statusBadgeVariant(accessibleInfo.status)}>
                {accessibleInfo.status}
              </Badge>
            </CardAction>
          )}
          {canister.state.availability === CanisterAvailability.Deleted && (
            <CardAction>
              <Badge variant="destructive">Deleted</Badge>
            </CardAction>
          )}
        </CardHeader>

        {accessibleInfo && (
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Cycles</div>
                <div className="font-medium">
                  {formatCycles(accessibleInfo.cycles)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Memory</div>
                <div className="font-medium">
                  {formatBytes(accessibleInfo.memorySize)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Burn / day</div>
                <div className="font-medium">
                  {formatCycles(accessibleInfo.idleCyclesBurnedPerDay)}
                </div>
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter>
          <Link
            to={`/projects/${projectId}/canisters/${canister.id}`}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            View details &rarr;
          </Link>
        </CardFooter>
      </Card>

      {canister.state.availability === CanisterAvailability.Inaccessible && (
        <AddMissingCanisterControllerCta canisterId={canister.principal} />
      )}
      {canister.state.availability === CanisterAvailability.Deleted && (
        <DeletedCanisterCta
          canisterRecordId={canister.id}
          canisterPrincipal={canister.principal}
        />
      )}
    </>
  );
};
