import { AuthButton } from '@/components/layout/auth-button';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { selectIsAdmin, useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { NavLink } from 'react-router';

export const Header: FC = () => {
  const { isAuthenticated } = useAppStore();
  const isAdmin = useAppStore(selectIsAdmin);

  return (
    <header className="flex w-full flex-row items-center p-3">
      <NavLink to="/">
        <Logo className="h-13" />
      </NavLink>

      <div className="flex-1" />

      <NavigationMenu>
        <NavigationMenuList>
          {isAdmin && (
            <NavigationMenuItem>
              <NavigationMenuLink render={<NavLink to="/admin" />}>
                Admin
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}

          {isAuthenticated && (
            <NavigationMenuItem>
              <NavigationMenuLink render={<NavLink to="/profile" />}>
                Profile
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="ml-2 flex items-center gap-2">
        <ModeToggle />
        <AuthButton />
      </div>
    </header>
  );
};
