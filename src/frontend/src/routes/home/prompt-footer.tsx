import { CardFooter } from '@/components/ui/card';
import { ServerIcon, ShieldCheckIcon } from 'lucide-react';
import type { FC } from 'react';

export const PromptFooter: FC = () => (
  <CardFooter className="mt-2">
    <div className="grid w-full grid-cols-2 border-t pt-6">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="text-muted-foreground" />
        <p className="text-muted-foreground text-xs leading-tight">
          Swiss Data Protection
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ServerIcon className="text-muted-foreground" />
        <p className="text-muted-foreground text-xs leading-tight">
          Switzerland-based Nodes
        </p>
      </div>
    </div>
  </CardFooter>
);
