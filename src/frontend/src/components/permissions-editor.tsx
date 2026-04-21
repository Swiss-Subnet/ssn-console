import { LoadingButton } from '@/components/loading-button';
import { Label } from '@/components/ui/label';
import type {
  OrgPermissions,
  ProjectPermissions,
} from '@/lib/api-models/permissions';
import { showErrorToast } from '@/lib/toast';
import { useEffect, useState } from 'react';

export type PermissionField<T> = {
  key: keyof T & string;
  label: string;
  description?: string;
};

export const orgPermissionFields: PermissionField<OrgPermissions>[] = [
  {
    key: 'orgAdmin',
    label: 'Organization admin',
    description:
      "Rename and delete the organization, and edit teams' organization permissions.",
  },
  {
    key: 'memberManage',
    label: 'Manage members',
    description: 'Invite, add, and remove organization members.',
  },
  {
    key: 'teamManage',
    label: 'Manage teams',
    description: 'Create, rename, and delete teams.',
  },
  {
    key: 'projectCreate',
    label: 'Create projects',
    description: 'Create new projects in the organization.',
  },
  {
    key: 'billingManage',
    label: 'Manage billing',
    description: 'View and change billing settings.',
  },
];

export const projectPermissionFields: PermissionField<ProjectPermissions>[] = [
  {
    key: 'projectAdmin',
    label: 'Project admin',
    description:
      "Rename and delete the project, attach and detach teams, and edit teams' project permissions.",
  },
  {
    key: 'projectSettings',
    label: 'Edit settings',
    description: 'Rename the project and change settings.',
  },
  {
    key: 'canisterManage',
    label: 'Manage canisters',
    description: 'Create and remove canisters.',
  },
  {
    key: 'canisterOperate',
    label: 'Operate canisters',
    description: 'Start, stop, and install canisters.',
  },
  {
    key: 'canisterRead',
    label: 'Read canisters',
    description: 'View canister status and history.',
  },
  {
    key: 'proposalCreate',
    label: 'Create proposals',
    description: 'Create canister operation proposals.',
  },
  {
    key: 'proposalApprove',
    label: 'Approve proposals',
    description: 'Approve canister operation proposals.',
  },
  {
    key: 'approvalPolicyManage',
    label: 'Manage approval policy',
    description: 'Change the approval policy.',
  },
];

export type PermissionsEditorProps<T extends Record<string, boolean>> = {
  value: T;
  fields: PermissionField<T>[];
  disabled?: boolean;
  errorToastTitle: string;
  onSave: (next: T) => Promise<void>;
};

export function PermissionsEditor<T extends Record<string, boolean>>({
  value,
  fields,
  disabled,
  errorToastTitle,
  onSave,
}: PermissionsEditorProps<T>) {
  const [draft, setDraft] = useState<T>(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const isDirty = fields.some(f => draft[f.key] !== value[f.key]);

  function toggle(key: keyof T & string) {
    setDraft(prev => ({ ...prev, [key]: !prev[key] }) as T);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      showErrorToast(errorToastTitle, err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fields.map(f => {
          const id = `perm-${String(f.key)}`;
          return (
            <div key={String(f.key)} className="flex items-start gap-2">
              <input
                id={id}
                type="checkbox"
                className="mt-0.5"
                disabled={disabled || isSaving}
                checked={draft[f.key]}
                onChange={() => toggle(f.key)}
              />
              <div className="grid gap-1">
                <Label htmlFor={id}>{f.label}</Label>
                {f.description && (
                  <p className="text-muted-foreground text-xs">
                    {f.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LoadingButton
        isLoading={isSaving}
        disabled={!isDirty || !!disabled}
        onClick={handleSave}
      >
        Save Permissions
      </LoadingButton>
    </div>
  );
}
