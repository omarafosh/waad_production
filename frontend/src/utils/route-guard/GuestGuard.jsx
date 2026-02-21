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
      const from = location?.state?.from || APP_DEFAULT_PATH;

      // Security: Prevent Open Redirect to external domains
      // 1. Must start with /
      // 2. Must NOT start with // (protocol-relative)
      // 3. Must NOT contain special encoded characters or protocol markers
      const isValidInternalPath =
        from.startsWith('/') &&
        !from.startsWith('//') &&
        !from.includes('\\') &&
        !from.includes('://') &&
        !/^[a-z0-9]+:/i.test(from); // No data:, javascript:, etc.

      const safeFrom = isValidInternalPath ? from : APP_DEFAULT_PATH;

      navigate(safeFrom, {
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
