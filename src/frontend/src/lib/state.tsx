import { useBackendApi } from '@/lib/api';
import type { UserProfile } from '@/lib/api-models/user-profile';
import type { PC } from '@/lib/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { createContext, useContext, useEffect, useState } from 'react';

export interface AppState {
  profile: UserProfile | null;
}

const initialAppState: AppState = {
  profile: null,
};

const AppStateContext = createContext<AppState>(initialAppState);

export const AppStateProvider: PC = ({ children }) => {
  const { isLoginSuccess } = useInternetIdentity();
  const backendApi = useBackendApi();

  const [state, setState] = useState<AppState>(initialAppState);

  useEffect(() => {
    async function getOrCreateUserProfile(): Promise<void> {
      const profile = await backendApi.getOrCreateMyUserProfile();

      setState(prevState => ({
        ...prevState,
        profile,
      }));
    }

    if (isLoginSuccess) {
      getOrCreateUserProfile();
    }
  }, [isLoginSuccess]);

  return (
    <AppStateContext.Provider value={state}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  return useContext(AppStateContext);
};
