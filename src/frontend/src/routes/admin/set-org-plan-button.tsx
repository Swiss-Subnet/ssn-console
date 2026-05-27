import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlanTier } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useState, type FC } from 'react';

export type SetOrgPlanButtonProps = {
  orgId: string;
  currentTier: PlanTier;
};

// Only tiers the (org_id, tier) setter accepts. Enterprise carries custom
// per-org limits and is assigned through a separate flow.
const SELECTABLE_TIERS: PlanTier[] = [PlanTier.Free, PlanTier.Pro];

export const SetOrgPlanButton: FC<SetOrgPlanButtonProps> = ({
  orgId,
  currentTier,
}) => {
  const { setAdminOrgPlan } = useAppStore();
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (currentTier === PlanTier.Enterprise) {
    return (
      <span className="text-muted-foreground text-xs">
        Managed via custom limits
      </span>
    );
  }

  async function onConfirm(tier: PlanTier): Promise<void> {
    setIsSaving(true);
    try {
      await setAdminOrgPlan(orgId, tier);
      showSuccessToast(`Plan changed to ${tier}`);
    } catch (err) {
      showErrorToast('Failed to change plan', err);
    } finally {
      setIsSaving(false);
      setPendingTier(null);
    }
  }

  if (pendingTier !== null) {
    return (
      <div className="flex items-center justify-end gap-1">
        <LoadingButton
          variant="default"
          size="sm"
          onClick={() => onConfirm(pendingTier)}
          isLoading={isSaving}
        >
          Set {pendingTier}
        </LoadingButton>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPendingTier(null)}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          Change plan
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SELECTABLE_TIERS.filter(tier => tier !== currentTier).map(tier => (
            <DropdownMenuItem key={tier} onClick={() => setPendingTier(tier)}>
              Move to {tier}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
