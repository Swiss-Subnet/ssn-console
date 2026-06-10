import { useRequireAdminCapability } from '@/lib/auth';
import { selectIsAdmin, useAppStore } from '@/lib/store';
import { TermsAndConditionsCurrent } from '@/routes/admin/terms-and-conditions-current';
import { TermsAndConditionsForm } from '@/routes/admin/terms-and-conditions-form';
import { TermsAndConditionsTable } from '@/routes/admin/terms-and-conditions-table';
import { type FC } from 'react';

const TermsAndConditionsTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectIsAdmin));
  return (
    <>
      <TermsAndConditionsCurrent />
      <TermsAndConditionsTable className="mt-6" />
      <TermsAndConditionsForm className="mt-6" />
    </>
  );
};

export default TermsAndConditionsTab;
