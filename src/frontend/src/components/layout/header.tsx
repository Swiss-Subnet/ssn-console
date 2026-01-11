import { AuthButton } from '@/components/layout/auth-button';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { useInternetIdentity } from 'ic-use-internet-identity';
import type { FC } from 'react';
import { NavLink } from 'react-router';

export const Header: FC = () => {
  const { isLoginSuccess } = useInternetIdentity();

  return (
    <header className="flex w-full flex-row items-center p-3">
      <NavLink to="/">
        <Logo className="h-13" />
      </NavLink>

      <div className="flex-1" />

      <NavigationMenu>
        <NavigationMenuList>
          {isLoginSuccess && (
            <NavigationMenuItem>
              <NavigationMenuLink render={<NavLink to="/dashboard" />}>
                Dashboard
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex items-center gap-2 ml-2">
        <ModeToggle />
        <AuthButton />
      </div>
    </header>
  );
};
