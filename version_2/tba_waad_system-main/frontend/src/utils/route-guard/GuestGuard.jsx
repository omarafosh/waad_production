import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// project imports
import { APP_DEFAULT_PATH } from 'config';
import useAuth from 'hooks/useAuth';
import { AUTH_STATUS } from 'contexts/AuthContext';

// ==============================|| GUEST GUARD - PUBLIC ROUTES ||============================== //

export default function GuestGuard({ children }) {
  const { authStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // CRITICAL: Only redirect when we KNOW user is authenticated
    // Do NOT redirect during INITIALIZING
    if (authStatus === AUTH_STATUS.AUTHENTICATED) {
      navigate(location?.state?.from ? location?.state?.from : APP_DEFAULT_PATH, {
        state: {
          from: ''
        },
        replace: true
      });
    }
  }, [authStatus, navigate, location]);

  // Always render children (login form) during INITIALIZING and UNAUTHENTICATED
  return children;
}

GuestGuard.propTypes = {
  children: PropTypes.node
};
