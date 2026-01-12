import { useAppStore } from '@/lib/store';
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
  const { isAuthenticated, isAuthInitialized } = useAppStore();
  const returnHome = useReturnHome();

  useEffect(() => {
    if (isAuthInitialized && !isAuthenticated) {
      returnHome();
    }
  }, [isAuthenticated, isAuthInitialized, returnHome]);
};

export const useRequireAdminAuth = (): void => {
  useRequireAuth();
  const { profile, isAuthInitialized, isProfileInitialized } = useAppStore();
  const returnHome = useReturnHome();

  useEffect(() => {
    if (isAuthInitialized && isProfileInitialized && !profile?.isAdmin) {
      returnHome();
    }
  }, [isAuthInitialized, isProfileInitialized, profile, returnHome]);
};
