import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WidthLock } from '@/components/width-lock';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { PromptFooter } from '@/routes/home/prompt-footer';
import { PromptHeader } from '@/routes/home/prompt-header';
import { LoaderIcon } from 'lucide-react';
import type { FC } from 'react';

export type SignUpPromptProps = {
  className?: string;
};

export const SignUpPrompt: FC<SignUpPromptProps> = ({ className }) => {
  const { login, isAuthInitialized, isLoggingIn } = useAppStore();
  const isAuthReady = isAuthInitialized && !isLoggingIn;

  return (
    <Card className={cn('mx-auto max-w-md', className)}>
      <PromptHeader />

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

      <PromptFooter />
    </Card>
  );
};
