import { HeaderMenu } from '@/components/layout/header-menu';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { selectIsActive, useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { NavLink } from 'react-router';

export const Header: FC = () => {
  const { isAuthenticated } = useAppStore();
  const isActive = useAppStore(selectIsActive);

  return (
    <header className="bg-background flex h-20 w-full flex-row items-center gap-8 border-b p-3">
      <NavLink to="/">
        <Logo className="h-13" />
      </NavLink>

      {isAuthenticated && isActive && <OrgSwitcher />}

      <div className="flex-1" />

      <NavigationMenu>
        <NavigationMenuList>
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
