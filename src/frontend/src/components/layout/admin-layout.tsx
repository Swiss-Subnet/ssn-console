import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Button } from '@/components/ui/button';
import {
  selectCanManageUsers,
  selectCanReadAllOrgs,
  selectIsAdmin,
  useAdminPrivacyStore,
  useAppStore,
} from '@/lib/store';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import type { FC } from 'react';
import { NavLink, Outlet } from 'react-router';

type AdminTab = {
  to: string;
  label: string;
  visible: boolean;
};

export const AdminLayout: FC = () => {
  const censorEmails = useAdminPrivacyStore(s => s.censorEmails);
  const toggleCensorEmails = useAdminPrivacyStore(s => s.toggleCensorEmails);

  const isAdmin = useAppStore(selectIsAdmin);
  const canManageUsers = useAppStore(selectCanManageUsers);
  const canReadAllOrgs = useAppStore(selectCanReadAllOrgs);

  const TABS: AdminTab[] = [
    { to: '/admin', label: 'Overview', visible: true },
    { to: '/admin/users', label: 'Users', visible: canManageUsers },
    {
      to: '/admin/organizations',
      label: 'Organizations',
      visible: canReadAllOrgs,
    },
    {
      to: '/admin/trusted-partners',
      label: 'Trusted Partners',
      visible: isAdmin,
    },
    {
      to: '/admin/terms-and-conditions',
      label: 'Terms & Conditions',
      visible: isAdmin,
    },
    { to: '/admin/staff', label: 'Staff Permissions', visible: isAdmin },
  ].filter(tab => tab.visible);

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <H1>Admin</H1>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleCensorEmails}
          aria-pressed={!censorEmails}
        >
          {censorEmails ? <EyeOffIcon /> : <EyeIcon />}
          {censorEmails ? 'Emails hidden' : 'Emails shown'}
        </Button>
      </div>

      <nav
        aria-label="Admin sections"
        className="border-border mt-4 flex flex-wrap gap-1 border-b"
      >
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </Container>
  );
};
