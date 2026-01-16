import { HeaderMenu } from '@/components/layout/header-menu';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';
import { NavLink } from 'react-router';

export const Header: FC = () => {
  const { isAuthenticated } = useAppStore();

  return (
    <header className="flex w-full flex-row items-center p-3">
      <NavLink to="/">
        <Logo className="h-13" />
      </NavLink>

      <div className="flex-1" />

      <div className="ml-2 flex items-center gap-2">
        <ModeToggle />

        {isAuthenticated && <HeaderMenu />}
      </div>
    </header>
  );
};
