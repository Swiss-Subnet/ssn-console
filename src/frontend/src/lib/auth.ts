import { isNil } from '@/lib/nil';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

const useReturnHome = (): (() => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  };
};

export const useRequireAuth = (): void => {
  const { isAuthenticated, isInitializingAuth } = useAppStore();
  const returnHome = useReturnHome();

  useEffect(() => {
    if (!isInitializingAuth && !isAuthenticated) {
      returnHome();
    }
  }, [isAuthenticated, isInitializingAuth, returnHome]);
};

export const useRequireAdminAuth = (): void => {
  useRequireAuth();
  const { profile, isInitializingAuth } = useAppStore();
  const returnHome = useReturnHome();

  useEffect(() => {
    if (!isInitializingAuth && (isNil(profile) || !profile.isAdmin)) {
      returnHome();
    }
  }, [isInitializingAuth, profile, returnHome]);
};
