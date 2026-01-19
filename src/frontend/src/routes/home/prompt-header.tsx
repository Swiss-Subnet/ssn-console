import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { LockIcon, ServerIcon } from 'lucide-react';
import type { FC } from 'react';

export const PromptHeader: FC = () => (
  <CardHeader>
    <CardTitle className="flex flex-row justify-between">
      <div className="text-muted-foreground flex flex-row items-center gap-2">
        <ServerIcon />
        Status: Restricted
      </div>

      <Badge variant="destructive">
        <LockIcon /> Waitlist Active
      </Badge>
    </CardTitle>
  </CardHeader>
);
