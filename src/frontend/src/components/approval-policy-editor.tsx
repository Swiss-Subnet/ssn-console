import { LoadingButton } from '@/components/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ApprovalOperationType,
  approvalOperationLabel,
  type ApprovalPolicy,
  type ApprovalPolicyType,
} from '@/lib/api-models';
import { showErrorToast } from '@/lib/toast';
import { useEffect, useState } from 'react';

export type ApprovalPolicyEditorProps = {
  operationType: ApprovalOperationType;
  value: ApprovalPolicyType;
  disabled?: boolean;
  onSave: (next: ApprovalPolicyType) => Promise<ApprovalPolicy>;
};

type DraftKind = 'AutoApprove' | 'FixedQuorum';

export function ApprovalPolicyEditor({
  operationType,
  value,
  disabled,
  onSave,
}: ApprovalPolicyEditorProps) {
  const [kind, setKind] = useState<DraftKind>(value.kind);
  const [thresholdText, setThresholdText] = useState<string>(
    value.kind === 'FixedQuorum' ? String(value.threshold) : '1',
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setKind(value.kind);
    setThresholdText(
      value.kind === 'FixedQuorum' ? String(value.threshold) : '1',
    );
  }, [value]);

  const parsedThreshold = Number.parseInt(thresholdText, 10);
  const thresholdValid =
    Number.isFinite(parsedThreshold) && parsedThreshold > 0;
  const draft: ApprovalPolicyType =
    kind === 'AutoApprove'
      ? { kind: 'AutoApprove' }
      : { kind: 'FixedQuorum', threshold: parsedThreshold };

  const isDirty =
    draft.kind !== value.kind ||
    (draft.kind === 'FixedQuorum' &&
      value.kind === 'FixedQuorum' &&
      draft.threshold !== value.threshold);

  const canSubmit =
    !disabled && isDirty && (kind === 'AutoApprove' || thresholdValid);

  async function handleSave() {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      showErrorToast('Failed to update approval policy', err);
    } finally {
      setIsSaving(false);
    }
  }

  const radioName = `approval-policy-${operationType}`;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {approvalOperationLabel(operationType)}
      </p>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <input
            id={`${radioName}-auto`}
            type="radio"
            className="mt-0.5"
            name={radioName}
            disabled={disabled || isSaving}
            checked={kind === 'AutoApprove'}
            onChange={() => setKind('AutoApprove')}
          />
          <div className="grid gap-1">
            <Label htmlFor={`${radioName}-auto`}>Auto-approve</Label>
            <p className="text-muted-foreground text-xs">
              Proposals execute immediately without a vote.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            id={`${radioName}-quorum`}
            type="radio"
            className="mt-0.5"
            name={radioName}
            disabled={disabled || isSaving}
            checked={kind === 'FixedQuorum'}
            onChange={() => setKind('FixedQuorum')}
          />
          <div className="grid w-full gap-2">
            <div className="grid gap-1">
              <Label htmlFor={`${radioName}-quorum`}>Require approvals</Label>
              <p className="text-muted-foreground text-xs">
                Proposals enter pending approval and execute once the threshold
                of approvers is reached.
              </p>
            </div>
            {kind === 'FixedQuorum' && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`${radioName}-threshold`}
                  className="text-xs font-normal"
                >
                  Threshold
                </Label>
                <Input
                  id={`${radioName}-threshold`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  className="h-8 w-24"
                  disabled={disabled || isSaving}
                  value={thresholdText}
                  onChange={e => setThresholdText(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <LoadingButton
        isLoading={isSaving}
        disabled={!canSubmit}
        onClick={handleSave}
      >
        Save Policy
      </LoadingButton>
    </div>
  );
}
