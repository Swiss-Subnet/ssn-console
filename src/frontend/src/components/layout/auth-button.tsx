import { Button } from '@/components/ui/button';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogInIcon, LogOutIcon, LoaderIcon } from 'lucide-react';
import type { FC } from 'react';

export const AuthButton: FC = () => {
  const { login, clear, status } = useInternetIdentity();

  const buttonToRender = () => {
    switch (status) {
      default:
      case 'initializing':
      case 'logging-in':
        return (
          <Button size="icon" variant="outline" disabled>
            <LoaderIcon className="animate-spin" />
          </Button>
        );

      case 'idle':
      case 'error':
        return (
          <Button size="icon" variant="outline" onClick={() => login()}>
            <LogInIcon />
          </Button>
        );

      case 'success':
        return (
          <Button size="icon" variant="outline" onClick={() => clear()}>
            <LogOutIcon />
          </Button>
        );
    }
  };

  return <>{buttonToRender()}</>;
};
