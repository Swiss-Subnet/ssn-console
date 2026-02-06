import { createApiSlice } from '@/lib/store/api';
import { createAuthSlice } from '@/lib/store/auth';
import { createCanistersSlice } from '@/lib/store/canister';
import type { AppSlice } from '@/lib/store/model';
import { createTermsAndConditionsSlice } from '@/lib/store/terms-and-conditions';
import { createTrustedPartnerSlice } from '@/lib/store/trusted-partner';
import { createUserProfileSlice } from '@/lib/store/user-profile';
import { createUsersSlice } from '@/lib/store/users';
import { create } from 'zustand';

export const useAppStore = create<AppSlice>()((...a) => ({
  ...createAuthSlice(...a),
  ...createApiSlice(...a),
  ...createUserProfileSlice(...a),
  ...createUsersSlice(...a),
  ...createCanistersSlice(...a),
  ...createTrustedPartnerSlice(...a),
  ...createTermsAndConditionsSlice(...a)
}));
