import { isNotNil } from '@/lib/nil';
import {
  selectCanAccessAdmin,
  selectIsActive,
  selectIsAdmin,
  useAppStore,
} from '@/lib/store';
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
  const canAccessAdmin = useAppStore(selectCanAccessAdmin);
  const returnTo = useReturnTo();

  useEffect(() => {
    if (isProfileInitialized && !canAccessAdmin) {
      returnTo('/');
      return;
    }
  }, [isProfileInitialized, canAccessAdmin, returnTo]);
};

// Guards a single admin tab whose backend endpoint requires a specific
// capability. Controllers pass every check (selectCan* fold in isAdmin);
// staff are bounced to the admin landing if they lack the bit.
export const useRequireAdminCapability = (hasCapability: boolean): void => {
  const { isProfileInitialized } = useAppStore();
  const returnTo = useReturnTo();

  useEffect(() => {
    if (isProfileInitialized && !hasCapability) {
      returnTo('/admin');
      return;
    }
  }, [isProfileInitialized, hasCapability, returnTo]);
};
