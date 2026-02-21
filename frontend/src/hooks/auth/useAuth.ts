import { useContext } from 'react';

// auth provider
// Phase C Migration: Switched from JWT to Session-based AuthContext
import AuthContext, { AuthContextType } from 'contexts/AuthContext';

// ==============================|| AUTH HOOKS ||============================== //

export default function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) throw new Error('context must be use inside provider');

  return context;
}
