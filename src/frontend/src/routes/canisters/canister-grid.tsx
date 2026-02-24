import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CanisterGridEntry } from '@/routes/canisters/canister-grid-entry';
import { type FC } from 'react';

export type CanisterGridProps = {
  className?: string;
};

export const CanisterGrid: FC<CanisterGridProps> = ({ className }) => {
  const { canisters } = useAppStore();

  return (
    <div className={cn('grid grid-cols-1 gap-4', className)}>
      {canisters?.map(canister => (
        <CanisterGridEntry key={canister.id} canister={canister} />
      ))}
    </div>
  );
};
