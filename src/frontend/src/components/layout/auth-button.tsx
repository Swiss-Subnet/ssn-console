import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/app';
import { LogInIcon, LogOutIcon, LoaderIcon } from 'lucide-react';
import { type FC } from 'react';

export const AuthButton: FC = () => {
  const { login, logout, isAuthenticated, isAuthInitialized, isLoggingIn } =
    useAppStore();

  const buttonToRender = () => {
    if (!isAuthInitialized || isLoggingIn) {
      return (
        <Button size="icon" variant="outline" disabled>
          <LoaderIcon className="animate-spin" />
        </Button>
      );
    }

    if (isAuthenticated) {
      return (
        <Button size="icon" variant="outline" onClick={() => logout()}>
          <LogOutIcon />
        </Button>
      );
    }

    return (
      <Button size="icon" variant="outline" onClick={() => login()}>
        <LogInIcon />
      </Button>
    );
  };

  return <>{buttonToRender()}</>;
};
