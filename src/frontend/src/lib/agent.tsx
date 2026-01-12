import { SHOULD_FETCH_ROOT_KEY } from '@/env';
import { isNil } from '@/lib/nil';
import type { PC } from '@/lib/utils';
import { HttpAgent } from '@dfinity/agent';
import { createContext, useContext, useMemo } from 'react';

const AgentContext = createContext<HttpAgent | null>(null);

export const AgentProvider: PC = ({ children }) => {
  const agent = useMemo(
    () =>
      HttpAgent.createSync({
        shouldFetchRootKey: SHOULD_FETCH_ROOT_KEY,
      }),
    [],
  );

  return (
    <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
  );
};

export const useAgent = (): HttpAgent => {
  const agent = useContext(AgentContext);
  if (isNil(agent)) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return agent;
};
