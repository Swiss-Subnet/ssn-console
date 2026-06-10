import { useRequireAdminCapability } from '@/lib/auth';
import { selectCanReadAllOrgs, useAppStore } from '@/lib/store';
import { OrganizationsTable } from '@/routes/admin/organizations-table';
import { type FC } from 'react';

const OrganizationsTab: FC = () => {
  useRequireAdminCapability(useAppStore(selectCanReadAllOrgs));
  return <OrganizationsTable />;
};

export default OrganizationsTab;
