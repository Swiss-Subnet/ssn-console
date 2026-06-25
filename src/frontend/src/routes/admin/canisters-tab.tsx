import { useRequireAdminCapability } from '@/lib/auth';
import { selectCanReadAllOrgs, useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { CanistersTable } from '@/routes/admin/canisters-table';
import { useEffect, type FC } from 'react';

const CanistersTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectCanReadAllOrgs));

  const initializeAdminCanisters = useAppStore(s => s.initializeAdminCanisters);
  const isInitialized = useAppStore(s => s.isAdminCanistersInitialized);

  useEffect(() => {
    if (isInitialized) return;
    initializeAdminCanisters().catch(err =>
      showErrorToast('Failed to load canisters', err),
    );
  }, [isInitialized, initializeAdminCanisters]);

  return <CanistersTable />;
};

export default CanistersTab;
