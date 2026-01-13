import { createApiSlice } from '@/lib/store/api';
import { createAuthSlice } from '@/lib/store/auth';
import type { AppSlice } from '@/lib/store/model';
import { createUserProfileSlice } from '@/lib/store/user-profile';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAppStore = create<AppSlice>()(
  devtools((...a) => ({
    ...createAuthSlice(...a),
    ...createApiSlice(...a),
    ...createUserProfileSlice(...a),
  })),
);
