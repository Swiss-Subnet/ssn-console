import { TermsAndConditionsCurrent } from '@/routes/admin/terms-and-conditions-current';
import { TermsAndConditionsForm } from '@/routes/admin/terms-and-conditions-form';
import { TermsAndConditionsTable } from '@/routes/admin/terms-and-conditions-table';
import { type FC } from 'react';

const AdminTermsAndConditions: FC = () => (
  <>
    <TermsAndConditionsCurrent />
    <TermsAndConditionsTable className="mt-6" />
    <TermsAndConditionsForm className="mt-6" />
  </>
);

export default AdminTermsAndConditions;
