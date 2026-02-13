import { createBrowserRouter, Navigate } from 'react-router-dom';

// project imports
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';

// ==============================|| ROUTING RENDER - FIXED ||============================== //

/**
 * CRITICAL FIX:
 * 1. LoginRoutes MUST come BEFORE MainRoutes
 * 2. Root "/" redirects to "/login" (public) NOT "/dashboard" (protected)
 * 3. Add 404 catch-all at the end
 */
const router = createBrowserRouter(
  [
    // Root of /app redirects to login
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />
    },

    // STEP 2: LoginRoutes FIRST (public routes)
    LoginRoutes,

    // STEP 3: MainRoutes (protected routes with RouteGuard)
    MainRoutes,

    // STEP 4: Catch-all 404 (must be last)
    {
      path: '*',
      element: <Navigate to="/404" replace />
    }
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME,
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

export default router;
