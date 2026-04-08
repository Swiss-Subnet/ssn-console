import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/auth';
import { isNil } from '@/lib/nil';

const RedirectToCanisters: FC = () => {
  useRequireAuth();
  const navigate = useNavigate();
  const { projects } = useAppStore();
  const defaultProject = projects[0];
  if (isNil(defaultProject)) {
    throw new Error('Default project not found');
  }

  useEffect(() => {
    if (projects.length > 0) {
      navigate(`/projects/${defaultProject.id}/canisters`, { replace: true });
    }
  }, [navigate, projects]);

  return <></>;
};

export default RedirectToCanisters;
