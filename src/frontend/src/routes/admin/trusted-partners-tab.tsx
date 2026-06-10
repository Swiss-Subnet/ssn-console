import { useRequireAdminCapability } from '@/lib/auth';
import { selectIsAdmin, useAppStore } from '@/lib/store';
import { TrustedPartnerForm } from '@/routes/admin/trusted-partner-form';
import { TrustedPartnerTable } from '@/routes/admin/trusted-partner-table';
import { type FC } from 'react';

const TrustedPartnersTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectIsAdmin));
  return (
    <>
      <TrustedPartnerTable />
      <TrustedPartnerForm className="mt-12" />
    </>
  );
};

export default TrustedPartnersTab;
