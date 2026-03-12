import { isNil } from '@/lib/nil';
import { useReturnTo } from '@/lib/utils';
import { useMemo } from 'react';
import { useParams } from 'react-router';

export function useRequireProjectId(): string {
  const { projectId } = useParams();
  const returnTo = useReturnTo();

  return useMemo(() => {
    if (isNil(projectId)) {
      returnTo('/');
      throw new Error(':projectId param is required');
    }

    return projectId;
  }, [projectId]);
}
