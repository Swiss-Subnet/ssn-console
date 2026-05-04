import { TrustedPartnerForm } from '@/routes/admin/trusted-partner-form';
import { TrustedPartnerTable } from '@/routes/admin/trusted-partner-table';
import { type FC } from 'react';

const AdminTrustedPartners: FC = () => (
  <>
    <TrustedPartnerTable />
    <TrustedPartnerForm className="mt-12" />
  </>
);

export default AdminTrustedPartners;
