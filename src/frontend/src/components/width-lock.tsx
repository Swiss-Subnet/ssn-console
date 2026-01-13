import { cn, type PC } from '@/lib/utils';
import React from 'react';

export type WidthLockProps = {
  activeId: string;
};

export const WidthLock: PC<WidthLockProps> = ({ children, activeId }) => {
  return (
    <span className="inline-grid grid-cols-1 grid-rows-1 items-center justify-items-center">
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) {
          throw new Error('WidthLock children must be valid React elements.');
        }

        const isActive = child.key === activeId;

        return (
          <span
            className={cn(
              'col-start-1 row-start-1',
              isActive ? 'visible-interactive' : 'hidden-inert',
            )}
            aria-hidden={!isActive}
          >
            {child}
          </span>
        );
      })}
    </span>
  );
};
