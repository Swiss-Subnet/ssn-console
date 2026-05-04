import { isNotNil } from '@/lib/nil';
import { selectIsActive, selectIsAdmin, useAppStore } from '@/lib/store';
import { useReturnTo } from '@/lib/utils';
import { useEffect } from 'react';

export const useRequireAuth = (): void => {
  const {
    isProfileInitialized,
    isTermsAndConditionsInitialized,
    termsAndConditions,
  } = useAppStore();
  const isActive = useAppStore(selectIsActive);
  const isAdmin = useAppStore(selectIsAdmin);
  const returnTo = useReturnTo();

  useEffect(() => {
    if (!isProfileInitialized || !isTermsAndConditionsInitialized) {
      return;
    }

    if (!isActive) {
      returnTo('/');
      return;
    }

    if (
      !isAdmin &&
      isNotNil(termsAndConditions) &&
      !termsAndConditions.hasAccepted
    ) {
      returnTo('/terms-and-conditions');
      return;
    }
  }, [
    isProfileInitialized,
    isTermsAndConditionsInitialized,
    termsAndConditions,
    isActive,
    isAdmin,
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
