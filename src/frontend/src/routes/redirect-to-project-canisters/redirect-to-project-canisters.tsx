import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/auth';

const RedirectToCanisters: FC = () => {
  useRequireAuth();
  const navigate = useNavigate();
  const { projects } = useAppStore();

  useEffect(() => {
    if (projects.length > 0) {
      navigate(`/projects/${projects[0].id}/canisters`, { replace: true });
    }
  }, [navigate, projects]);

  return <></>;
};

export default RedirectToCanisters;
