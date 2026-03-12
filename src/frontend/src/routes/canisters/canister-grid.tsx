import type { Canister } from '@/lib/api-models';
import { cn } from '@/lib/utils';
import { CanisterGridEntry } from '@/routes/canisters/canister-grid-entry';
import { type FC } from 'react';

export type CanisterGridProps = {
  className?: string;
  canisters: Canister[];
};

export const CanisterGrid: FC<CanisterGridProps> = ({
  className,
  canisters,
}) => {
  return (
    <div className={cn('grid grid-cols-1 gap-4', className)}>
      {canisters.map(canister => (
        <CanisterGridEntry key={canister.id} canister={canister} />
      ))}
    </div>
  );
};
