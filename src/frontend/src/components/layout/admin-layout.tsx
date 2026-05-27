import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Button } from '@/components/ui/button';
import { useAdminPrivacyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import type { FC } from 'react';
import { NavLink, Outlet } from 'react-router';

type AdminTab = {
  to: string;
  label: string;
};

const TABS: AdminTab[] = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/trusted-partners', label: 'Trusted Partners' },
  { to: '/admin/terms-and-conditions', label: 'Terms & Conditions' },
  { to: '/admin/staff', label: 'Staff Permissions' },
  { to: '/admin/organizations', label: 'Organizations' },
];

export const AdminLayout: FC = () => {
  const censorEmails = useAdminPrivacyStore(s => s.censorEmails);
  const toggleCensorEmails = useAdminPrivacyStore(s => s.toggleCensorEmails);

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
