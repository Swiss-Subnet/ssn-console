import { useRequireAdminCapability } from '@/lib/auth';
import { selectIsAdmin, useAppStore } from '@/lib/store';
import { StaffForm } from '@/routes/admin/staff-form';
import { StaffTable } from '@/routes/admin/staff-table';
import { type FC } from 'react';

const StaffTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectIsAdmin));
  return (
    <>
      <StaffTable />
      <StaffForm className="mt-12" />
    </>
  );
};

export default StaffTab;
