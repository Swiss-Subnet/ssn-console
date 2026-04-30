import { createApiSlice } from '@/lib/store/api';
import { createApprovalPoliciesSlice } from '@/lib/store/approval-policy';
import { createAuthSlice } from '@/lib/store/auth';
import { createCanistersSlice } from '@/lib/store/canister';
import { createInvitesSlice } from '@/lib/store/invite';
import type { AppSlice } from '@/lib/store/model';
import { createOrganizationsSlice } from '@/lib/store/organization';
import { createProjectsSlice } from '@/lib/store/project';
import { createTeamsSlice } from '@/lib/store/team';
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
  ...createTermsAndConditionsSlice(...a),
  ...createProjectsSlice(...a),
  ...createOrganizationsSlice(...a),
  ...createTeamsSlice(...a),
  ...createInvitesSlice(...a),
  ...createApprovalPoliciesSlice(...a),
}));
