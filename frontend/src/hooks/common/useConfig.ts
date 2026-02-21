import { useContext } from 'react';
import { ConfigContext } from 'contexts/ConfigContext';

// ==============================|| CONFIG - HOOKS ||============================== //

export default function useConfig(): any {
  const context = useContext(ConfigContext);

  if (!context) throw new Error('useConfig must be use inside ConfigProvider');

  return context;
}
