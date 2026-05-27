import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AdminPrivacyState = {
  censorEmails: boolean;
  setCensorEmails: (value: boolean) => void;
  toggleCensorEmails: () => void;
};

// Default on so screen-sharing/demos don't doxx user emails until explicitly revealed.
export const useAdminPrivacyStore = create<AdminPrivacyState>()(
  persist(
    set => ({
      censorEmails: true,
      setCensorEmails: value => set({ censorEmails: value }),
      toggleCensorEmails: () =>
        set(state => ({ censorEmails: !state.censorEmails })),
    }),
    { name: 'ssn-admin-privacy' },
  ),
);
