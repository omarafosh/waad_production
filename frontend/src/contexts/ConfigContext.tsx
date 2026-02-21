import React, { createContext, useMemo, ReactNode } from 'react';

// project imports
import config from 'config';
import { useLocalStorage } from 'hooks/useLocalStorage';

// ==============================|| CONFIG CONTEXT ||============================== //

export const ConfigContext = createContext<any>(undefined);

// ==============================|| CONFIG PROVIDER ||============================== //

export interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const { state, setState, setField, resetState } = useLocalStorage('tba-waad-system-config', config);

  const memoizedValue = useMemo(() => ({ state, setState, setField, resetState }), [state, setField, setState, resetState]);

  return <ConfigContext.Provider value={memoizedValue}>{children}</ConfigContext.Provider>;
}
