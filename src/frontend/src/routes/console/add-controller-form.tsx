import { LoadingButton } from '@/components/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isNil } from '@/lib/nil';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Principal } from '@icp-sdk/core/principal';
import { useState, type FC } from 'react';

export type AddControllerFormProps = {
  canisterId: string;
  className?: string;
};

export const AddControllerForm: FC<AddControllerFormProps> = ({
  canisterId,
  className,
}) => {
  const { addController } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [principal, setPrincipal] = useState('');

  async function onFormSubmitted(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    if (isNil(principal) || principal.trim() === '') {
      return;
    }

    try {
      Principal.fromText(principal);
    } catch {
      return;
    }

    setIsSaving(true);
    try {
      await addController(canisterId, principal);
      setPrincipal('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className={cn('flex w-full items-center gap-2', className)}
      onSubmit={event => onFormSubmitted(event)}
    >
      <Label htmlFor={`controller-principal-${canisterId}`} className="sr-only">
        Controller Principal
      </Label>

      <Input
        id={`controller-principal-${canisterId}`}
        type="text"
        placeholder="Controller Principal"
        value={principal}
        onChange={e => setPrincipal(e.target.value)}
      />

      <LoadingButton type="submit" variant="outline" isLoading={isSaving}>
        Add Controller
      </LoadingButton>
    </form>
  );
};
