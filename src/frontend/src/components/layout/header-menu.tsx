import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isNotNil } from '@/lib/nil';
import { selectIsActive, selectIsAdmin, useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  CircleUserRoundIcon,
  ClipboardIcon,
  CogIcon,
  LogOutIcon,
  MailIcon,
  ScrollTextIcon,
} from 'lucide-react';
import { useMemo, type FC } from 'react';
import { NavLink } from 'react-router';

export const HeaderMenu: FC = () => {
  const { identity, logout, termsAndConditions, myInvites } = useAppStore();
  const isActive = useAppStore(selectIsActive);
  const isAdmin = useAppStore(selectIsAdmin);
  const pendingInviteCount = myInvites.length;

  const principal = useMemo(
    () => identity?.getPrincipal().toString(),
    [identity],
  );

  async function onPrincipalClicked(): Promise<void> {
    if (principal) {
      await navigator.clipboard.writeText(principal);
      showSuccessToast('Principal copied to clipboard!');
    }
  }

  async function onLogoutClicked(): Promise<void> {
    try {
      await logout();
    } catch (err) {
      showErrorToast('Logout failed', err);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <CircleUserRoundIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your Principal</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => onPrincipalClicked()}>
            <p className="truncate">{principal}</p>

            <ClipboardIcon />
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {isAdmin && (
            <DropdownMenuItem
              className="justify-between"
              render={<NavLink to="/admin" />}
            >
              Admin
              <CogIcon />
            </DropdownMenuItem>
          )}

          {isActive && (
            <DropdownMenuItem
              className="justify-between"
              render={<NavLink to="/invitations" />}
            >
              Invitations
              {pendingInviteCount > 0 ? (
                <span className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 text-xs">
                  {pendingInviteCount}
                </span>
              ) : (
                <MailIcon />
              )}
            </DropdownMenuItem>
          )}

          {isActive && isNotNil(termsAndConditions) && (
            <DropdownMenuItem
              className="justify-between"
              render={<NavLink to="/terms-and-conditions" />}
            >
              Terms and Conditions
              <ScrollTextIcon />
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="justify-between"
            onClick={() => onLogoutClicked()}
          >
            Log Out
            <LogOutIcon />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
