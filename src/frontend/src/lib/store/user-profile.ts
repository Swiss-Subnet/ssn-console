import type { MyUserProfile } from '@/lib/api-models/user-profile';
import type {
  AppSlice,
  AppStateCreator,
  UserProfileSlice,
} from '@/lib/store/model';

export const createUserProfileSlice: AppStateCreator<
  UserProfileSlice
> = set => ({
  profile: null,

  setUserProfile: (profile: MyUserProfile) => {
    set({ profile });
  },

  clearUserProfile: () => {
    set({ profile: null });
  },
});

export function selectIsAdmin(state: AppSlice): boolean {
  return state.profile?.isAdmin ?? false;
}
