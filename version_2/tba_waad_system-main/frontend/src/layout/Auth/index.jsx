import { Outlet, Navigate } from 'react-router-dom';
import useAuth from 'hooks/useAuth';
import { APP_DEFAULT_PATH } from 'config';

// ==============================|| LAYOUT - AUTH - SIMPLIFIED ||============================== //

export default function AuthLayout() {
  const { user } = useAuth();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to={APP_DEFAULT_PATH} replace />;
  }

  // Otherwise show login page
  return <Outlet />;
}
