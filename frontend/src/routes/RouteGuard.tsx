import { Navigate, useLocation } from 'react-router-dom';
import { useMemo, ReactNode } from 'react';

// project imports
import useAuth from 'hooks/useAuth';
import { AUTH_STATUS } from 'contexts/AuthContext';

// MUI imports for loader
import { Box, CircularProgress, Typography, Paper, Alert, Button } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

// ==============================|| LOADING COMPONENT ||============================== //

const FullPageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: 2
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary">
      جاري التحقق من الصلاحيات...
    </Typography>
  </Box>
);

// ==============================|| FORBIDDEN COMPONENT ||============================== //

interface ForbiddenPageProps {
  reason: 'PROVIDER_NOT_LINKED' | 'ACCESS_DENIED';
}

const ForbiddenPage = ({ reason }: ForbiddenPageProps) => {
  const messages = {
    PROVIDER_NOT_LINKED: {
      title: 'حساب مقدم الخدمة غير مكتمل',
      description: 'لم يتم ربط حسابك بمقدم خدمة. يرجى التواصل مع مدير النظام.',
      titleEn: 'Provider Account Incomplete',
      descriptionEn: 'Your account is not linked to a provider. Please contact system administrator.'
    },
    ACCESS_DENIED: {
      title: 'غير مصرح بالوصول',
      description: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
      titleEn: 'Access Denied',
      descriptionEn: 'You do not have permission to access this page.'
    }
  };

  const msg = messages[reason] || messages.ACCESS_DENIED;

  const handleLogout = () => {
    window.location.href = '/login';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: 'grey.100',
        p: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 450,
          textAlign: 'center'
        }}
      >
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />

        <Typography variant="h5" gutterBottom color="error">
          {msg.title}
        </Typography>

        <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
          {msg.description}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {msg.descriptionEn}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={handleLogout}
          fullWidth
        >
          العودة لتسجيل الدخول
        </Button>
      </Paper>
    </Box>
  );
};

// ==============================|| ROUTE GUARD - STABLE (NO INFINITE RENDER) ||============================== //

interface RouteGuardProps {
  allowedRoles?: string[] | null;
  children: ReactNode;
}

interface GuardState {
  status: 'loading' | 'redirect' | 'forbidden' | 'allowed';
  reason: 'PROVIDER_NOT_LINKED' | 'ACCESS_DENIED' | null;
  redirect: string | null;
}

/**
 * RouteGuard - RBAC with Stable State Management
 *
 * CANONICAL FIX (2026-01-16): Prevents Infinite Render Loop
 * 
 * THREE STATES (mutually exclusive):
 * 1. LOADING (authStatus === INITIALIZING) → Show loader, NO redirect
 * 2. FORBIDDEN (invalid state detected) → Show ForbiddenPage, NO redirect
 * 3. ALLOWED → Render children
 *
 * CRITICAL RULES:
 * ❌ NO Navigate/redirect during loading
 * ❌ NO setState/dispatch inside render
 * ❌ NO useEffect without stable dependencies
 * ✅ Use useMemo for stable computed values
 * ✅ Return static components (Loader/Forbidden) instead of Navigate
 *
 * @param {string[]|null} allowedRoles - Array of allowed role names
 * @param {React.ReactNode} children - Component to render
 */
const RouteGuard = ({ allowedRoles = null, children }: RouteGuardProps) => {
  const { user, authStatus } = useAuth();
  const location = useLocation();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Compute guard state using useMemo (stable, no re-render triggers)
  // ═══════════════════════════════════════════════════════════════════════════
  const guardState = useMemo<GuardState>(() => {
    // STATE 1: Still loading - MUST wait
    if (authStatus === AUTH_STATUS.INITIALIZING) {
      return { status: 'loading', reason: null, redirect: null };
    }

    // STATE 2: Not authenticated
    if (authStatus === AUTH_STATUS.UNAUTHENTICATED || !user) {
      return { status: 'redirect', reason: null, redirect: '/login' };
    }

    // Get user's primary role
    const userRole = user.roles?.[0] || null;
    const userRoles = user.roles || [];

    // No role = forbidden
    if (!userRole) {
      return { status: 'forbidden', reason: 'ACCESS_DENIED', redirect: null };
    }

    // SUPER_ADMIN has unrestricted access (check if ANY role is SUPER_ADMIN)
    if (userRoles.includes('SUPER_ADMIN')) {
      return { status: 'allowed', reason: null, redirect: null };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROVIDER SECURITY CHECK (STABLE - NO SIDE EFFECTS)
    // ═══════════════════════════════════════════════════════════════════════════
    if (userRole === 'PROVIDER') {
      // providerId states:
      // - undefined = still loading (should not happen if authStatus is AUTHENTICATED)
      // - null = explicitly not linked (FORBIDDEN)
      // - number = valid

      // Check if providerId is missing or explicitly null
      if (user.providerId === undefined || user.providerId === null) {
        // Log once (useMemo ensures this only runs when deps change)
        console.error('❌ [RouteGuard] PROVIDER user without providerId:', user.username);
        return { status: 'forbidden', reason: 'PROVIDER_NOT_LINKED', redirect: null };
      }

      // PROVIDER can access: /provider/*, /pre-approvals/*, and /reports/*
      const isProviderRoute = location.pathname.startsWith('/provider');
      const isPreApprovalsRoute = location.pathname.startsWith('/pre-approvals');
      const isReportsRoute = location.pathname.startsWith('/reports');

      if (!isProviderRoute && !isPreApprovalsRoute && !isReportsRoute) {
        return { status: 'redirect', reason: null, redirect: '/provider/eligibility-check' };
      }
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAccess = allowedRoles.includes(userRole);

      if (!hasAccess) {
        // PROVIDER gets redirected to their portal
        if (userRole === 'PROVIDER') {
          return { status: 'redirect', reason: null, redirect: '/provider/eligibility-check' };
        }
        return { status: 'forbidden', reason: 'ACCESS_DENIED', redirect: null };
      }
    }

    // All checks passed
    return { status: 'allowed', reason: null, redirect: null };
  }, [authStatus, user, allowedRoles, location.pathname]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Render based on computed state (NO side effects in render)
  // ═══════════════════════════════════════════════════════════════════════════

  // STATE: Loading - show loader, DO NOT redirect
  if (guardState.status === 'loading') {
    return <FullPageLoader />;
  }

  // STATE: Forbidden - SILENT REDIRECT (2026-02-09)
  // User requested "show/hide only" without error messages.
  // CRITICAL: Prevent infinite loop by checking current path
  if (guardState.status === 'forbidden') {
    const target = '/dashboard';
    if (location.pathname === target || location.pathname === '/') {
      // If we're already at target and still forbidden, just hide (silent fail)
      return null;
    }
    return <Navigate to={target} replace />;
  }

  // STATE: Redirect - safe to use Navigate (state is stable)
  if (guardState.status === 'redirect') {
    return <Navigate to={guardState.redirect as string} replace />;
  }

  // STATE: Allowed - render children
  return children;
};

export default RouteGuard;
