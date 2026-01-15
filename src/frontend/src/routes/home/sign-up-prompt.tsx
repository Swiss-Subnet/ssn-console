import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WidthLock } from '@/components/width-lock';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LoaderIcon,
  LockIcon,
  ServerIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import type { FC } from 'react';

export type SignUpPromptProps = {
  className?: string;
};

export const SignUpPrompt: FC<SignUpPromptProps> = ({ className }) => {
  const { login, isAuthInitialized, isLoggingIn } = useAppStore();
  const isAuthReady = isAuthInitialized && !isLoggingIn;

  return (
    <Card className={cn('mx-auto max-w-md', className)}>
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

      <CardContent>
        <Button
          size="lg"
          className="mt-2 w-full"
          onClick={() => login()}
          disabled={!isAuthReady}
        >
          <WidthLock activeId={isAuthReady ? 'ready' : 'waiting'}>
            {isAuthReady ? (
              <span key="ready">Sign Up for the Waitlist</span>
            ) : (
              <LoaderIcon className="animate-spin" key="waiting" />
            )}
          </WidthLock>
        </Button>
      </CardContent>

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
    </Card>
  );
};
