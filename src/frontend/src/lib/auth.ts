import { isNotNil } from '@/lib/nil';
import { selectIsActive, selectIsAdmin, useAppStore } from '@/lib/store';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

const useReturnTo = (): ((to: string) => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string) => {
      if (location.pathname !== to) {
        navigate(to);
        return;
      }
    },
    [location.pathname, navigate],
  );
};

export const useRequireAuth = (): void => {
  const {
    isProfileInitialized,
    isTermsAndConditionsInitialized,
    termsAndConditions,
  } = useAppStore();
  const isActive = useAppStore(selectIsActive);
  const returnTo = useReturnTo();

  useEffect(() => {
    if (!isProfileInitialized || !isTermsAndConditionsInitialized) {
      return;
    }

    if (!isActive) {
      returnTo('/');
      return;
    }

    if (isNotNil(termsAndConditions) && !termsAndConditions.hasAccepted) {
      returnTo('/terms-and-conditions');
      return;
    }
  }, [
    isProfileInitialized,
    isTermsAndConditionsInitialized,
    termsAndConditions,
    isActive,
    returnTo,
  ]);
};

export const useRequireAdminAuth = (): void => {
  const { isProfileInitialized } = useAppStore();
  const isAdmin = useAppStore(selectIsAdmin);
  const returnTo = useReturnTo();

  useEffect(() => {
    if (isProfileInitialized && !isAdmin) {
      returnTo('/');
      return;
    }
  }, [isProfileInitialized, isAdmin, returnTo]);
};
