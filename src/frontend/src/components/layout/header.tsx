import { HeaderMenu } from '@/components/layout/header-menu';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { NavLink } from 'react-router';

export const Header: FC = () => {
  const { isAuthenticated } = useAppStore();

  return (
    <header className="bg-background flex h-20 w-full flex-row items-center border-b p-3">
      <NavLink to="/">
        <Logo className="h-13" />
      </NavLink>

      <div className="flex-1" />

      <NavigationMenu>
        <NavigationMenuList>
          {isAuthenticated && (
            <>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  render={<NavLink to="/dashboard" />}
                >
                  Dashboard
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  render={<NavLink to="/billing" />}
                >
                  Billing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </>
          )}

          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              render={
                <a
                  target="_blank"
                  href="https://docs.google.com/document/d/1CRA_jWHF2rwCXqWUaarbZJE7UF5YHOFbzkuAgRciIXU/edit?usp=sharing"
                />
              }
            >
              Developer Guide
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <ModeToggle />
          </NavigationMenuItem>

          {isAuthenticated && (
            <NavigationMenuItem>
              <HeaderMenu />
            </NavigationMenuItem>
          )}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};
