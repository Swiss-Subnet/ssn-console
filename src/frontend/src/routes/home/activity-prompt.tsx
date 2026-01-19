import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PromptFooter } from '@/routes/home/prompt-footer';
import { PromptHeader } from '@/routes/home/prompt-header';
import type { FC } from 'react';
import { NavLink } from 'react-router';

export type ActivityPromptProps = {
  className?: string;
};

export const ActivityPrompt: FC<ActivityPromptProps> = ({ className }) => (
  <Card className={cn('mx-auto max-w-md', className)}>
    <PromptHeader />

    <CardContent>
      <div className="mb-6 text-center">
        <p className="font-semibold">You're in!</p>
        <p className="text-muted-foreground text-sm">
          You have access to the closed beta.
        </p>
      </div>

      <Button
        size="lg"
        className="mt-2 w-full"
        nativeButton={false}
        render={<NavLink to="/canisters" />}
      >
        Manage Your Canisters
      </Button>
    </CardContent>

    <PromptFooter />
  </Card>
);
