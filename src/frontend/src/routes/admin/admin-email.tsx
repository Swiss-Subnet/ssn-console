import { maskEmail } from '@/lib/format';
import { useAdminPrivacyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { FC } from 'react';

type AdminEmailProps = {
  email: string | null;
  fallback?: string;
  className?: string;
};

export const AdminEmail: FC<AdminEmailProps> = ({
  email,
  fallback = 'None provided',
  className,
}) => {
  const censor = useAdminPrivacyStore(s => s.censorEmails);

  if (!email) {
    return (
      <span className={cn('text-muted-foreground', className)}>{fallback}</span>
    );
  }

  const display = censor ? maskEmail(email) : email;
  return (
    <span className={className} title={censor ? undefined : email}>
      {display}
    </span>
  );
};
