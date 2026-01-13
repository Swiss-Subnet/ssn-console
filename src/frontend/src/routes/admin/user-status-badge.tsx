import { Badge } from '@/components/ui/badge';
import { WidthLock } from '@/components/width-lock';
import { UserStatus, type UserProfile } from '@/lib/api-models';
import type { FC } from 'react';

export type UserStatusBadgeProps = {
  user: UserProfile;
};

export const UserStatusBadge: FC<UserStatusBadgeProps> = ({ user }) => {
  const isActive = user.status === UserStatus.Active;

  return (
    <Badge variant={isActive ? 'success' : 'secondary'}>
      <WidthLock activeId={isActive ? 'active' : 'inactive'}>
        <span key="active">Active</span>
        <span key="inactive">Inactive</span>
      </WidthLock>
    </Badge>
  );
};
