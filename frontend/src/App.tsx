import { RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';

// project imports
import router from 'routes';
import Snackbar from 'components/@extended/Snackbar';
import Metrics from 'metrics';
import Loader from 'components/Loader';

// providers
import AppProviders from 'providers/AppProviders';

// Production console cleanup
import { suppressMUIDeprecationWarnings } from 'utils/gridMigration';

// Initialize production mode settings
if (import.meta.env.PROD) {
  suppressMUIDeprecationWarnings();
}

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

export default function App() {
  return (
    <AppProviders>
      <Suspense fallback={<Loader />}>
        <RouterProvider router={router} />
      </Suspense>
      <Snackbar />
      <Metrics />
    </AppProviders>
  );
}
