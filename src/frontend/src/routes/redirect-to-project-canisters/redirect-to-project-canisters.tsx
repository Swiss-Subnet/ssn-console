import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '@/lib/store';
import { isNil, isNotNil } from '@/lib/nil';

const RedirectToCanisters: FC = () => {
  const navigate = useNavigate();
  const { projects } = useAppStore();

  useEffect(() => {
    const defaultProject = projects[0];
    if (isNotNil(defaultProject)) {
      navigate(`/projects/${defaultProject.id}/canisters`, { replace: true });
    }
  }, [navigate, projects]);

  return <></>;
};

export default RedirectToCanisters;
