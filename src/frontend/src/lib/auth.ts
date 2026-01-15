import { selectIsActive, selectIsAdmin, useAppStore } from '@/lib/store';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

const useReturnHome = (): (() => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [location.pathname, navigate]);
};

export const useRequireAuth = (): void => {
  const { isProfileInitialized } = useAppStore();
  const isActive = useAppStore(selectIsActive);
  const returnHome = useReturnHome();

  useEffect(() => {
    if (isProfileInitialized && !isActive) {
      returnHome();
    }
  }, [isProfileInitialized, isActive, returnHome]);
};

export const useRequireAdminAuth = (): void => {
  const { isProfileInitialized } = useAppStore();
  const isAdmin = useAppStore(selectIsAdmin);
  const returnHome = useReturnHome();

  useEffect(() => {
    if (isProfileInitialized && !isAdmin) {
      returnHome();
    }
  }, [isProfileInitialized, isAdmin, returnHome]);
};
